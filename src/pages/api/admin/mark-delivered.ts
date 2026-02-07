import type { APIRoute } from 'astro';
import { createServerSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase';
import { sendEmail, getDeliveryConfirmedTemplate } from '@/lib/brevo';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, notes } = await request.json();

        if (!orderId) {
            return new Response(
                JSON.stringify({ success: false, message: 'Order ID is required' }),
                { status: 400 }
            );
        }

        // Use admin cookies (isAdmin = true)
        const userClient = await createServerSupabaseClient({ cookies }, true);
        const { data: { session } } = await userClient.auth.getSession();

        if (!session) {
            return new Response(
                JSON.stringify({ success: false, message: 'Unauthorized' }),
                { status: 401 }
            );
        }

        const { data: profile, error: profileError } = await userClient
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile?.is_admin) {
            return new Response(
                JSON.stringify({ success: false, message: 'Admin access required' }),
                { status: 403 }
            );
        }

        // Call RPC using authenticated client (SECURITY DEFINER handles permissions)
        const { data: result, error: rpcError } = await userClient.rpc(
            'admin_mark_delivered',
            {
                p_order_id: orderId,
                p_admin_id: session.user.id,
                p_notes: notes || 'Marked as delivered'
            }
        );

        if (rpcError) {
            console.error('[API] RPC error:', rpcError);
            return new Response(
                JSON.stringify({ success: false, message: rpcError.message }),
                { status: 500 }
            );
        }

        if (!result.success) {
            return new Response(
                JSON.stringify({ success: false, message: result.error, code: result.code }),
                { status: 400 }
            );
        }

        // Fetch order details to get customer email
        const { data: orderData, error: orderError } = await userClient
            .from('orders')
            .select('id, customer_name, guest_email, user_id')
            .eq('id', orderId)
            .single();

        if (!orderError && orderData) {
            // Get customer email (either guest_email or from auth.users)
            let customerEmail = orderData.guest_email;
            let customerName = orderData.customer_name || 'Cliente';

            if (!customerEmail && orderData.user_id) {
                try {
                    // Try to get the user info from auth
                    const { data: { user }, error: userError } = await userClient.auth.admin.getUser(orderData.user_id);
                    if (user && !userError) {
                        customerEmail = user.email;
                        customerName = user.user_metadata?.full_name || customerName;
                    }
                } catch (e) {
                    console.log('[API] Could not fetch auth user, using defaults');
                }
            }

            // Send delivery confirmed email
            if (customerEmail) {
                const emailTemplate = getDeliveryConfirmedTemplate(customerName);

                await sendEmail({
                    to: customerEmail,
                    subject: `Tu pedido #${orderId.slice(0, 8).toUpperCase()} ha sido entregado`,
                    htmlContent: emailTemplate
                });

                console.log('[API] Delivery confirmed email sent to:', customerEmail);
            }
        }

        return new Response(
            JSON.stringify({ success: true, data: result }),
            { status: 200 }
        );

    } catch (err: any) {
        console.error('[API] Error:', err);
        return new Response(
            JSON.stringify({ success: false, message: err.message }),
            { status: 500 }
        );
    }
};
