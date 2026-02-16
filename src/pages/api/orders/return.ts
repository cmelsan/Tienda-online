import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendEmail, getReturnRequestTemplate } from '@/lib/brevo';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, reason, itemIds } = await request.json();

        if (!orderId || !reason) {
            return new Response(JSON.stringify({ success: false, message: 'Order ID and reason are required' }), { status: 400 });
        }

        const supabase = await createServerSupabaseClient({ cookies });

        // Verify session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
        }

        // Call RPC with optional item IDs for per-item returns
        const { data, error } = await supabase.rpc('request_return', {
            p_order_id: orderId,
            p_reason: reason,
            p_item_ids: itemIds || null
        });

        console.log('[Return API] RPC called with:', { orderId, reason });
        console.log('[Return API] RPC error:', error);
        console.log('[Return API] RPC data:', data);

        if (error) {
            console.error('[Return API] Return request error:', error);
            return new Response(JSON.stringify({ success: false, message: `RPC Error: ${error.message}` }), { status: 500 });
        }

        // Check if RPC returned success
        if (data && !data.success) {
            console.warn('[Return API] RPC returned success=false:', data);
            return new Response(JSON.stringify(data), { status: 400 });
        }

        // Send confirmation email
        try {
            console.log('[Return API] Attempting to send email...');
            
            // Get customer email from session and order data
            const customerEmail = session.user.email;
            const customerName = session.user.user_metadata?.full_name || 'Cliente';

            console.log('[Return API] Customer email:', customerEmail);
            console.log('[Return API] Customer name:', customerName);

            // Get order number for email subject
            let orderNumber = 'XXX';
            let returnedItemsForEmail: { name: string; quantity: number; price: number }[] = [];
            try {
                const { data: orderData } = await supabase
                    .from('orders')
                    .select('order_number')
                    .eq('id', orderId)
                    .single();
                
                if (orderData?.order_number) {
                    orderNumber = orderData.order_number;
                }

                // Fetch items that were marked for return
                const { data: returnItems } = await supabase
                    .from('order_items')
                    .select('quantity, price_at_purchase, products(name)')
                    .eq('order_id', orderId)
                    .eq('return_status', 'requested');

                if (returnItems) {
                    returnedItemsForEmail = returnItems.map((item: any) => ({
                        name: item.products?.name || 'Producto',
                        quantity: item.quantity,
                        price: item.price_at_purchase
                    }));
                }
            } catch (e) {
                console.log('[Return API] Could not fetch order details');
            }

            // Send email if we have customer email
            if (customerEmail) {
                const htmlContent = getReturnRequestTemplate(customerName, orderNumber, returnedItemsForEmail);
                console.log('[Return API] Sending email with template...');
                
                await sendEmail({
                    to: customerEmail,
                    subject: `Solicitud de Devolución Recibida - Pedido #${orderNumber}`,
                    htmlContent
                });
                
                console.log(`[Return API] Email sent successfully to: ${customerEmail}`);
            } else {
                console.warn('[Return API] No customer email found in session');
            }
        } catch (emailError) {
            // Log email error but don't fail the request
            console.error('[Return API] Error sending confirmation email:', emailError);
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Solicitud de devolución procesada correctamente',
            data 
        }), { status: 200 });

    } catch (err: any) {
        console.error('Return API error:', err);
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
    }
};
