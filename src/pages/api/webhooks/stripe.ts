import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, getOrderConfirmationTemplate } from '@/lib/brevo';
import { createSaleInvoice } from '@/lib/invoices';

const DEBUG = import.meta.env.DEV;

// Initialize Supabase client for webhooks
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const POST: APIRoute = async ({ request }) => {
    const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
    const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

    if (DEBUG) {
        console.log('[Stripe Webhook] Request received');
        console.log('[Stripe Webhook] Stripe Secret Key present:', !!stripeSecretKey);
        console.log('[Stripe Webhook] Endpoint Secret present:', !!endpointSecret);
    }

    if (!stripeSecretKey || !endpointSecret) {
        console.error('Missing Stripe configuration');
        return new Response('Missing Stripe Keys', { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-12-15.clover',
    });

    const signature = request.headers.get('stripe-signature');

    if (DEBUG) {
        console.log('[Stripe Webhook] Stripe Signature present:', !!signature);
    }

    if (!signature) {
        return new Response('No signature provided', { status: 400 });
    }

    let event;
    try {
        const body = await request.text(); // Read raw body
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
        console.log('[Stripe Webhook] Event type:', event.type);
    } catch (err: any) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        const customerEmail = session.customer_email;

        if (DEBUG) {
            console.log('[Stripe Webhook] Payment successful for Order ID:', orderId ? 'present' : 'missing');
        }

        if (orderId && supabaseUrl && supabaseAnonKey) {
            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            try {
                // 1. Get order details
                const { data: orderData, error: fetchError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', orderId)
                    .single();

                if (fetchError) {
                    console.error('[Stripe Webhook] Error fetching order:', fetchError);
                } else {
                    console.log('[Stripe Webhook] Order data fetched');
                }

                // Get customer name from order (stored when order was created)
                const customerName = orderData?.customer_name || 'Cliente';
                if (DEBUG) {
                    console.log('[Stripe Webhook] Customer name:', customerName);
                }

                // 2. Update order status to 'paid'
                const { data: updateData, error: updateError } = await supabase.rpc('update_order_status', {
                    p_order_id: orderId,
                    p_status: 'paid'
                });

                if (updateError) {
                    console.error('[Stripe Webhook] Error updating order status:', updateError);
                } else {
                    console.log('[Stripe Webhook] Order status updated to paid');

                    // 2b. Crear factura de venta automáticamente
                    try {
                        const invoiceResult = await createSaleInvoice(supabase, orderId, session.id);
                        if (invoiceResult.success && invoiceResult.invoice_number) {
                            console.log('[Stripe Webhook] Sale invoice created:', invoiceResult.invoice_number);
                        } else if (!invoiceResult.success) {
                            console.warn('[Stripe Webhook] Could not create invoice:', invoiceResult.error);
                        }
                    } catch (invoiceErr: any) {
                        console.error('[Stripe Webhook] Invoice creation error:', invoiceErr.message);
                    }
                }

                // 3. Deduct stock — always runs after payment confirmed, regardless of email
                const { data: itemsData, error: itemsError } = await supabase
                    .from('order_items')
                    .select('*, products(name)')
                    .eq('order_id', orderId);

                if (itemsError) {
                    console.error('[Stripe Webhook] Error fetching order items for stock:', itemsError);
                } else if (itemsData && itemsData.length > 0) {
                    for (const item of itemsData) {
                        const { error: rpcStockError } = await supabase.rpc('decrease_product_stock_atomic', {
                            p_product_id: item.product_id,
                            p_quantity: item.quantity
                        });
                        if (rpcStockError) {
                            console.error('[Stripe Webhook] Stock deduction failed for product:', item.product_id, rpcStockError.message);
                        } else {
                            console.log('[Stripe Webhook] Stock deducted for product:', item.product_id, 'qty:', item.quantity);
                        }
                    }
                }

                // 4. Send confirmation email if we have customer email
                if (customerEmail && orderData) {
                    try {
                        if (DEBUG) {
                            console.log('[Stripe Webhook] Preparing to send confirmation email');
                        }

                        // Prepare items for email template (reuse itemsData already fetched)
                        const emailItems = itemsData?.map((item: any) => ({
                            product_id: item.product_id,
                            name: item.products?.name || 'Producto',
                            quantity: item.quantity,
                            price: item.price_at_purchase
                        })) || [];

                        const totalInCents = orderData.total_amount;

                        const htmlContent = getOrderConfirmationTemplate(
                            orderData.order_number,
                            customerName,
                            emailItems,
                            totalInCents
                        );

                        const emailResult = await sendEmail({
                            to: customerEmail,
                            subject: `📦 Pedido confirmado #${orderData.order_number}`,
                            htmlContent
                        });

                        if (emailResult.success) {
                            console.log('[Stripe Webhook] Confirmation email sent:', emailResult.messageId);
                        } else {
                            console.warn('[Stripe Webhook] Failed to send confirmation email:', emailResult.error);
                        }
                    } catch (emailErr: any) {
                        console.error('[Stripe Webhook] Exception sending email:', emailErr.message);
                    }
                } else {
                    console.warn('[Stripe Webhook] No customer email found or order data missing');
                }
            } catch (err: any) {
                console.error('[Stripe Webhook] Exception updating order:', err.message);
            }
        }
    }

    return new Response('Received', { status: 200 });
};
