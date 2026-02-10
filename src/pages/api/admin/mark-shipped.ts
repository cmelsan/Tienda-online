import type { APIRoute } from 'astro';
import { createServerSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase';
import { sendEmail, getShippingNotificationTemplate } from '@/lib/brevo';

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
            'admin_mark_shipped',
            {
                p_order_id: orderId,
                p_admin_id: session.user.id,
                p_notes: notes || 'Marked as shipped'
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
            .select('id, order_number, customer_name, guest_email, user_id')
            .eq('id', orderId)
            .single();

        if (!orderError && orderData) {
            // Get customer email (either guest_email or from auth.users)
            let customerEmail = orderData.guest_email;
            let customerName = orderData.customer_name || 'Cliente';
            let orderNumber = orderData.order_number || orderId.slice(0, 8).toUpperCase();

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

            // Send shipping notification email
            if (customerEmail) {
                const trackingUrl = `https://claudiaeclat.victoriafp.online/mi-cuenta/pedidos`;
                const emailTemplate = getShippingNotificationTemplate(
                    customerName,
                    undefined, // No tracking number yet
                    trackingUrl
                );

                await sendEmail({
                    to: customerEmail,
                    subject: `Tu pedido #${orderNumber} ha sido enviado`,
                    htmlContent: emailTemplate
                });

                console.log('[API] Shipping notification email sent to:', customerEmail);
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
