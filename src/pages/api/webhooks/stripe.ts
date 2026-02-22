import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabase, getAdminSupabaseClient } from '@/lib/supabase';
import { sendEmail, getOrderConfirmationTemplate } from '@/lib/brevo';
import { createSaleInvoice, fetchInvoiceAsAttachment } from '@/lib/invoices';

const DEBUG = import.meta.env.DEV;

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
        const couponId = session.metadata?.couponId || null;
        const discountAmount = session.metadata?.discountAmount
            ? parseInt(session.metadata.discountAmount, 10)
            : 0;

        if (DEBUG) {
            console.log('[Stripe Webhook] Payment successful for Order ID:', orderId ? 'present' : 'missing');
        }

        if (orderId) {

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

                // P0: Idempotencia — si el pedido ya está pagado no procesar de nuevo
                if (orderData?.status === 'paid' || orderData?.status === 'shipped' || orderData?.status === 'delivered') {
                    console.log('[Stripe Webhook] Order already processed (status:', orderData.status, '), skipping idempotent event');
                    return new Response('Already processed', { status: 200 });
                }

                // Get customer name from order (stored when order was created)
                const customerName = orderData?.customer_name || 'Cliente';
                if (DEBUG) {
                    console.log('[Stripe Webhook] Customer name:', customerName);
                }

                // 2. Save Stripe payment_intent ID + update order status to 'paid'
                const paymentIntentId = typeof session.payment_intent === 'string'
                    ? session.payment_intent
                    : session.payment_intent?.id || null;

                if (paymentIntentId) {
                    const { error: piError } = await supabase
                        .from('orders')
                        .update({ stripe_payment_intent_id: paymentIntentId })
                        .eq('id', orderId);
                    if (piError) {
                        console.error('[Stripe Webhook] CRITICAL: Failed to save stripe_payment_intent_id:', piError.message);
                    } else {
                        console.log('[Stripe Webhook] stripe_payment_intent_id saved:', paymentIntentId);
                    }
                }

                const { data: updateData, error: updateError } = await supabase.rpc('update_order_status', {
                    p_order_id: orderId,
                    p_new_status: 'paid'
                });

                // Invoice attachment — declared here so it's available for the email step
                let invoiceAttachment: { content: string; name: string } | null = null;

                if (updateError) {
                    console.error('[Stripe Webhook] Error updating order status:', updateError);
                } else {
                    console.log('[Stripe Webhook] Order status updated to paid');

                    // 2b. Crear factura de venta automáticamente
                    try {
                        const invoiceResult = await createSaleInvoice(supabase, orderId, session.id);
                        if (invoiceResult.success && invoiceResult.invoice_number) {
                            console.log('[Stripe Webhook] Sale invoice created:', invoiceResult.invoice_number);
                            if (invoiceResult.invoice_id) {
                                invoiceAttachment = await fetchInvoiceAsAttachment(supabase, invoiceResult.invoice_id);
                                if (invoiceAttachment) {
                                    console.log('[Stripe Webhook] Invoice PDF attachment ready:', invoiceAttachment.name);
                                } else {
                                    console.warn('[Stripe Webhook] PDF generation returned null — email will send without attachment');
                                }
                            }
                        } else if (!invoiceResult.success) {
                            console.warn('[Stripe Webhook] Could not create invoice:', invoiceResult.error);
                        }
                    } catch (invoiceErr: any) {
                        console.error('[Stripe Webhook] Invoice/PDF error (email will still send):', invoiceErr.message);
                        invoiceAttachment = null;
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
                    const stockFailures: string[] = [];

                    for (const item of itemsData) {
                        const { data: stockResult, error: rpcStockError } = await supabase.rpc('decrease_product_stock_atomic', {
                            p_product_id: item.product_id,
                            p_quantity: item.quantity
                        });
                        if (rpcStockError || stockResult?.success === false) {
                            const reason = rpcStockError?.message || stockResult?.error || 'Sin stock';
                            const productName = item.products?.name || item.product_id;
                            console.error('[Stripe Webhook] Stock deduction failed for product:', item.product_id, reason);
                            stockFailures.push(`${productName} (x${item.quantity}): ${reason}`);
                        } else {
                            console.log('[Stripe Webhook] Stock deducted for product:', item.product_id, 'qty:', item.quantity);
                        }
                    }

                    // If any stock failed, insert a visible alert in order_status_history
                    if (stockFailures.length > 0 && orderId) {
                        const alertMessage = `STOCK_ISSUE: Sin stock suficiente para — ${stockFailures.join(' | ')}`;
                        await supabase.rpc('insert_order_stock_alert', {
                            p_order_id: orderId,
                            p_notes: alertMessage
                        });
                        console.warn('[Stripe Webhook] Stock alert inserted for order:', orderId, alertMessage);
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
                            htmlContent,
                            ...(invoiceAttachment ? { attachments: [invoiceAttachment] } : {})
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
                // 5. Register coupon usage (after payment confirmed — avoids tracking abandoned carts)
                // Uses admin client to bypass RLS — anon client would be blocked by insert policies
                if (couponId && discountAmount > 0) {
                    try {
                        const userId = orderData?.user_id || null;
                        // Prefer admin client (bypasses RLS); fallback to anon with SECURITY DEFINER fn
                        const couponClient = getAdminSupabaseClient() || supabase;
                        const { data: couponResult, error: couponRpcError } = await (couponClient as any).rpc(
                            'increment_coupon_usage_atomic',
                            {
                                p_coupon_id: couponId,
                                p_order_id: orderId,
                                p_user_id: userId,
                                p_discount_applied: discountAmount,
                            }
                        );
                        if (couponRpcError) {
                            console.error('[Stripe Webhook] Coupon RPC error:', couponRpcError.message);
                        } else if (couponResult?.success === false) {
                            console.warn('[Stripe Webhook] Coupon usage rejected by DB:', couponResult.error);
                        } else {
                            console.log('[Stripe Webhook] Coupon usage registered:', couponId, 'new_uses:', couponResult?.new_uses);
                        }
                    } catch (couponErr: any) {
                        console.error('[Stripe Webhook] Coupon usage tracking exception:', couponErr.message);
                    }
                }

            } catch (err: any) {
                console.error('[Stripe Webhook] Exception updating order:', err.message);
            }
        }
    }

    return new Response('Received', { status: 200 });
};
