import type { APIRoute } from 'astro';
import { createServerSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase';
import { sendEmail, getRefundProcessedTemplate } from '@/lib/brevo';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, newStatus, restoreStock, notes } = await request.json();

        if (!orderId || !newStatus) {
            return new Response(
                JSON.stringify({ success: false, message: 'Order ID and new status are required' }),
                { status: 400 }
            );
        }

        // Validate status
        if (!['returned', 'refunded'].includes(newStatus)) {
            return new Response(
                JSON.stringify({ success: false, message: 'Invalid status. Must be returned or refunded' }),
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
            'admin_process_return',
            {
                p_order_id: orderId,
                p_admin_id: session.user.id,
                p_new_status: newStatus,
                p_restore_stock: restoreStock || false,
                p_notes: notes || null
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

        // Send refund email if status is 'refunded'
        if (newStatus === 'refunded') {
            try {
                console.log('[Process Return API] Sending refund email for order:', orderId);

                // Fetch order details to get customer email and amount
                const { data: orderData, error: orderError } = await userClient
                    .from('orders')
                    .select('customer_name, guest_email, user_id, total_amount, order_number')
                    .eq('id', orderId)
                    .single();

                if (!orderError && orderData) {
                    let customerEmail = orderData.guest_email;
                    let customerName = orderData.customer_name || 'Cliente';

                    // If no guest email, use session email
                    if (!customerEmail && session.user.email) {
                        customerEmail = session.user.email;
                    }

                    console.log('[Process Return API] Customer email:', customerEmail);

                    // Send refund email
                    if (customerEmail) {
                        const htmlContent = getRefundProcessedTemplate(
                            customerName,
                            orderData.order_number,
                            orderData.total_amount
                        );

                        await sendEmail({
                            to: customerEmail,
                            subject: `Reembolso Procesado - Pedido #${orderData.order_number}`,
                            htmlContent
                        });

                        console.log('[Process Return API] Refund email sent to:', customerEmail);
                    }
                }
            } catch (emailError) {
                // Log error but don't fail the request
                console.error('[Process Return API] Error sending refund email:', emailError);
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
