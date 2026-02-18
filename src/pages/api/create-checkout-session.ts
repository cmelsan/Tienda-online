import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const YOUR_DOMAIN = import.meta.env.PUBLIC_SITE_URL || 'https://claudiaeclat.victoriafp.online';
const DEBUG = import.meta.env.DEV;

export const POST: APIRoute = async ({ request }) => {
    const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        return new Response(JSON.stringify({ error: 'Missing Stripe Secret Key' }), { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-12-15.clover',
    });

    try {
        const { items, orderId, email, discountAmount } = await request.json();

        if (!items || !orderId) {
            return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
        }

        // SECURITY: Validate prices against database (never trust client)
        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const productIds = items.map((item: any) => item.product.id);
        const { data: dbProducts, error: dbError } = await supabase
            .from('products')
            .select('id, name, price, stock, images')
            .in('id', productIds);

        if (dbError || !dbProducts) {
            console.error('[Checkout] Error fetching products:', dbError);
            return new Response(JSON.stringify({ error: 'Failed to validate products' }), { status: 500 });
        }

        // Prepare line items using DATABASE prices (not client prices)
        const line_items = items.map((item: any) => {
            const dbProduct = dbProducts.find(p => p.id === item.product.id);
            
            if (!dbProduct) {
                throw new Error(`Product not found: ${item.product.id}`);
            }

            // Validate stock availability
            if (item.quantity > dbProduct.stock) {
                throw new Error(`Insufficient stock for ${dbProduct.name}. Available: ${dbProduct.stock}`);
            }

            // Use DATABASE price (in cents), not client-provided price
            const unitAmount = Math.round(dbProduct.price);

            if (DEBUG) {
                console.log('[Checkout] Product validated:', {
                    name: dbProduct.name,
                    price: unitAmount,
                    quantity: item.quantity,
                    stock: dbProduct.stock
                });
            }

            return {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: dbProduct.name,
                        images: dbProduct.images && dbProduct.images.length > 0 ? [dbProduct.images[0]] : [],
                    },
                    unit_amount: unitAmount,
                },
                quantity: item.quantity,
            };
        });

        // Calculate subtotal from validated prices
        const subtotal = line_items.reduce((sum, item) => 
            sum + (item.price_data.unit_amount * item.quantity), 0
        );

        // Validate discount amount doesn't exceed subtotal
        const validDiscountAmount = discountAmount && discountAmount > 0 
            ? Math.min(Math.round(discountAmount), subtotal) 
            : 0;

        if (discountAmount > 0 && validDiscountAmount !== Math.round(discountAmount)) {
            console.warn('[Checkout] Discount amount capped to subtotal:', {
                requested: discountAmount,
                subtotal,
                applied: validDiscountAmount
            });
        }

        // Create Checkout Session configuration
        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${YOUR_DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${YOUR_DOMAIN}/carrito?canceled=true`,
            customer_email: email,
            metadata: {
                orderId: orderId,
                discountAmount: validDiscountAmount.toString(),
            },
        };

        // Apply discount using Stripe coupons (proper way)
        if (validDiscountAmount > 0) {
            // Create a one-time coupon for this specific discount
            const coupon = await stripe.coupons.create({
                amount_off: validDiscountAmount,
                currency: 'eur',
                duration: 'once',
                name: `Order Discount - ${orderId}`,
            });

            sessionConfig.discounts = [{
                coupon: coupon.id,
            }];

            if (DEBUG) {
                console.log('[Checkout] Discount coupon created:', {
                    amount: validDiscountAmount,
                    coupon_id: coupon.id
                });
            }
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create(sessionConfig);

        if (DEBUG) {
            console.log('[Checkout] Session created:', {
                session_id: session.id,
                amount_total: session.amount_total,
                items: line_items.length
            });
        }

        return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('[Checkout] Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
