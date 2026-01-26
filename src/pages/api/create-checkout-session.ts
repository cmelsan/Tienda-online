import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const YOUR_DOMAIN = import.meta.env.PUBLIC_SITE_URL || 'https://claudiaeclat.victoriafp.online';

export const POST: APIRoute = async ({ request }) => {
    const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        return new Response(JSON.stringify({ error: 'Missing Stripe Secret Key' }), { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-12-15.clover',
    });

    try {
        const { items, orderId, email, discountAmount, finalTotal } = await request.json();

        if (!items || !orderId) {
            return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
        }

        // Prepare line items for Stripe
        const line_items = items.map((item: any) => {
            // Stripe expects amounts in cents
            const unitAmount = Math.round(item.product.price);

            return {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: item.product.name,
                        images: item.product.images ? [item.product.images[0]] : [],
                    },
                    unit_amount: unitAmount,
                },
                quantity: item.quantity,
            };
        });

        // If there's a discount, apply it to the last item
        if (discountAmount && discountAmount > 0 && line_items.length > 0) {
            const lastIndex = line_items.length - 1;
            const lastItem = line_items[lastIndex];
            const currentAmount = lastItem.price_data.unit_amount * lastItem.quantity;
            const discountAmountCents = Math.round(discountAmount);
            const newAmount = Math.max(0, currentAmount - discountAmountCents);
            
            // Update the last item with the discounted price
            line_items[lastIndex].price_data.unit_amount = Math.round(newAmount / lastItem.quantity);
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${YOUR_DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${YOUR_DOMAIN}/carrito?canceled=true`,
            customer_email: email, // Pre-fill email if available
            metadata: {
                orderId: orderId, // Crucial for matching webhook events to orders
                discountAmount: discountAmount ? Math.round(discountAmount) : 0,
            },
        });

        return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Stripe Session Creation Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
