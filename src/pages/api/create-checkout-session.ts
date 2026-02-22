import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

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
        const { items, orderId, email, discountAmount, couponId } = await request.json();

        if (!items || !orderId) {
            return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
        }

        // SECURITY: Validate orderId format before hitting the DB
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(orderId)) {
            return new Response(JSON.stringify({ error: 'Invalid orderId' }), { status: 400 });
        }

        // SECURITY: Validate prices against database (never trust client)
        const productIds = items.map((item: any) => item.product.id);

        // Fetch products including flash sale fields to compute server-side price
        const productsResult = await supabase
            .from('products')
            .select('id, name, price, stock, images, is_flash_sale, flash_sale_discount, flash_sale_end_time')
            .in('id', productIds);

        if (productsResult.error || !productsResult.data) {
            console.error('[Checkout] Error fetching products:', productsResult.error);
            return new Response(JSON.stringify({ error: 'Failed to validate products' }), { status: 500 });
        }
        const dbProducts = productsResult.data;

        // Fetch featured offers (rebajas) from app_settings to apply server-side discounts
        const { data: offersData } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'featured_offers')
            .single();

        // Build a map of productId → discount percentage for rebajas
        const featuredOffersMap: Record<string, number> = {};
        if (Array.isArray(offersData?.value)) {
            for (const offer of offersData.value as any[]) {
                if (offer.id && offer.discount > 0) {
                    featuredOffersMap[offer.id] = offer.discount;
                }
            }
        }

        const line_items = items.map((item: any) => {
            const dbProduct = dbProducts.find(p => p.id === item.product.id);
            
            if (!dbProduct) {
                throw new Error(`Product not found: ${item.product.id}`);
            }

            // Validate stock availability
            if (item.quantity > dbProduct.stock) {
                throw new Error(`Insufficient stock for ${dbProduct.name}. Available: ${dbProduct.stock}`);
            }

            // SECURITY: Calculate effective price server-side — never trust client value.
            // Apply the best available discount: flash sale OR featured offer (rebajas).
            const now = new Date();
            const isFlashSaleActive =
                dbProduct.is_flash_sale &&
                dbProduct.flash_sale_discount > 0 &&
                (!dbProduct.flash_sale_end_time || new Date(dbProduct.flash_sale_end_time) > now);

            const flashSalePrice = isFlashSaleActive
                ? Math.round(dbProduct.price * (1 - dbProduct.flash_sale_discount / 100))
                : dbProduct.price;

            const featuredDiscount = featuredOffersMap[dbProduct.id] || 0;
            const featuredOfferPrice = featuredDiscount > 0
                ? Math.round(dbProduct.price * (1 - featuredDiscount / 100))
                : dbProduct.price;

            // Use the lowest price between flash sale and featured offer
            const unitAmount = Math.min(flashSalePrice, featuredOfferPrice);

            if (DEBUG) {
                console.log('[Checkout] Product validated:', {
                    name: dbProduct.name,
                    dbPrice: dbProduct.price,
                    clientPrice: item.price,
                    effectivePrice: unitAmount,
                    flashSale: isFlashSaleActive,
                    featuredDiscount: featuredDiscount,
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

        // Calculate subtotal from validated prices (after flash sale / featured offers)
        const subtotal = line_items.reduce((sum, item) => 
            sum + (item.price_data.unit_amount * item.quantity), 0
        );

        // Use the discount amount exactly as calculated in the cart (coupon already applied there)
        const validDiscountAmount = discountAmount && discountAmount > 0
            ? Math.min(Math.round(discountAmount), subtotal)
            : 0;

        // Create Checkout Session configuration
        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${YOUR_DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${YOUR_DOMAIN}/carrito?canceled=true&orderId=${orderId}`,
            customer_email: email,
            metadata: {
                orderId: orderId,
                discountAmount: validDiscountAmount.toString(),
                couponId: couponId || '',
            },
        };

        // Apply discount using Stripe coupons (proper way)
        if (validDiscountAmount > 0) {
            // Create a one-time coupon for this specific discount
            const coupon = await stripe.coupons.create({
                amount_off: validDiscountAmount,
                currency: 'eur',
                duration: 'once',
                name: `Descuento-${orderId.slice(0, 8)}`,
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
