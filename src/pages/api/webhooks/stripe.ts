import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for webhooks
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const POST: APIRoute = async ({ request }) => {
    const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
    const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !endpointSecret) {
        console.error('Missing Stripe configuration');
        return new Response('Missing Stripe Keys', { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-12-15.clover',
    });

    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return new Response('No signature provided', { status: 400 });
    }

    let event;
    try {
        const body = await request.text(); // Read raw body
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        console.log(`[Stripe Webhook] Payment successful for Order ID: ${orderId}`);

        if (orderId && supabaseUrl && supabaseAnonKey) {
            const supabase = createClient(supabaseUrl, supabaseAnonKey);

            try {
                // Call RPC to update order status
                const { data, error } = await supabase.rpc('update_order_status', {
                    p_order_id: orderId,
                    p_status: 'paid'
                });

                if (error) {
                    console.error('[Stripe Webhook] Error updating order status:', error);
                } else {
                    console.log('[Stripe Webhook] Order status updated successfully');
                }
            } catch (err: any) {
                console.error('[Stripe Webhook] Exception updating order:', err.message);
            }
        }
    }

    return new Response('Received', { status: 200 });
};
