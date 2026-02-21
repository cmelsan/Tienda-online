import type { APIRoute } from 'astro';
import { createServerSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase';
import { sendEmail, getRefundProcessedTemplate } from '@/lib/brevo';
import { createCreditNote, fetchInvoiceAsAttachment } from '@/lib/invoices';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, newStatus, restoreStock, notes } = await request.json();

        if (!orderId || !newStatus) {
            return new Response(
                JSON.stringify({ success: false, message: 'Order ID and new status are required' }),
                { status: 400 }
            );
        }

        // Validate status — 'delivered' is used when rejecting a return (revert back)
        if (!['returned', 'refunded', 'delivered'].includes(newStatus)) {
            return new Response(
                JSON.stringify({ success: false, message: 'Invalid status' }),
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
                console.log('[Process Return API] Attempting to send refund email for:', orderId);

                // Fetch order details to get customer email and amount
                const { data: orderData, error: orderError } = await userClient
                    .from('orders')
                    .select('id, customer_name, guest_email, user_id, total_amount, order_number')
                    .eq('id', orderId)
                    .single();

                console.log('[Process Return API] Order fetch:', { orderError, hasData: !!orderData });

                if (!orderError && orderData) {
                    // Get customer email (either guest_email or from auth.users)
                    let customerEmail = orderData.guest_email;
                    let customerName = orderData.customer_name || 'Cliente';

                    console.log('[Process Return API] Guest email:', customerEmail);

                    if (!customerEmail && orderData.user_id) {
                        try {
                            // Try to get the user info from auth
                            const { data: { user }, error: userError } = await (userClient.auth.admin as any).getUserById(orderData.user_id);
                            if (user && !userError) {
                                customerEmail = user.email;
                                customerName = user.user_metadata?.full_name || customerName;
                                console.log('[Process Return API] Got email from auth:', customerEmail);
                            }
                        } catch (e) {
                            console.log('[Process Return API] Could not fetch auth user');
                        }
                    }

                    // Send refund email - use refund_amount from RPC result if available (partial refund)
                    if (customerEmail) {
                        const refundAmount = result?.refund_amount || orderData.total_amount;
                        const emailTemplate = getRefundProcessedTemplate(
                            customerName,
                            orderData.order_number,
                            refundAmount
                        );

                        // Crear nota de abono y prepararla como adjunto
                        let creditAttachment: { content: string; name: string } | null = null;
                        try {
                            const creditResult = await createCreditNote(userClient, {
                                orderId,
                                refundAmount,
                                refundedItemIds: [],
                                notes: notes || undefined,
                            });
                            if (creditResult.success && creditResult.credit_note_id) {
                                creditAttachment = await fetchInvoiceAsAttachment(userClient, creditResult.credit_note_id);
                                console.log('[Process Return API] Credit note created:', creditResult.credit_note_number);
                            }
                        } catch (creditErr: any) {
                            console.error('[Process Return API] Credit note error:', creditErr.message);
                        }

                        await sendEmail({
                            to: customerEmail,
                            subject: `Tu reembolso #${orderData.order_number} ha sido procesado`,
                            htmlContent: emailTemplate,
                            ...(creditAttachment ? { attachments: [creditAttachment] } : {})
                        });

                        console.log('[Process Return API] Refund email sent to:', customerEmail);
                    } else {
                        console.log('[Process Return API] No customer email found');
                    }
                }
            } catch (emailError) {
                // Log error but don't fail the request
                console.error('[Process Return API] Error sending email:', emailError);
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
