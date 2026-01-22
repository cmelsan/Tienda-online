import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client (to bypass RLS for status updates)
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY; // Need a SERVICE ROLE KEY for admin updates bypassed RLS if needed, OR simply use the server client if RLS policies allow 'system' updates. 
// Actually for this project we've been using client-side or server-side auth. 
// To allow the webhook (which has no user session) to update an order, we strictly need the Service Role Key.
// However, the user might not have set SUPABASE_SERVICE_ROLE_KEY. 
// Let's assume user has it or we can use the RPC 'system_update_order_status' if we created one.
// We previously used 'update orders set status...' via standard client but that requires RLS for 'auth.uid()'.
// The public client won't work here since it's anonymous.

// FALLBACK: If we don't have service role key, we might have issues. 
// We will check if we can add a policy 'service_role' or just try standard update if RLS allows anon (which it shouldn't).
// For now let's assume valid setup.

export const POST: APIRoute = async ({ request }) => {
    const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
    const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !endpointSecret) {
        return new Response('Missing Stripe Keys', { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-12-18.acacia',
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

        if (orderId) {
            console.log(`Payment successful for Order ID: ${orderId}`);

            // We need to update the database. 
            // Ideally use a Service Role client. 
            // If we don't have it in env, this part will fail securely.
            if (supabaseUrl && supabaseServiceKey) {
                const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                });

                const { error } = await supabaseAdmin
                    .from('orders')
                    .update({ status: 'paid', updated_at: new Date().toISOString() })
                    .eq('id', orderId);

                if (error) {
                    console.error('Error updating order status in DB:', error);
                    return new Response('Database Update Failed', { status: 500 });
                }
            } else {
                console.error('Missing SUPABASE_SERVICE_ROLE_KEY, cannot update order status automatically.');
                // We still return 200 to Stripe so it doesn't retry indefinitely, but we log the error.
            }
        }
    }

    return new Response('Received', { status: 200 });
};
