import type { APIRoute } from 'astro';
import { createServerSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase';
import Stripe from 'stripe';

// Statuses that require a Stripe refund when cancelled
const PAID_STATUSES = ['paid', 'shipped', 'delivered'];

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, notes } = await request.json();

        if (!orderId) {
            return new Response(
                JSON.stringify({ success: false, message: 'Order ID is required' }),
                { status: 400 }
            );
        }

        // Get session and verify admin (use admin cookies)
        const userClient = await createServerSupabaseClient({ cookies }, true);
        const { data: { session } } = await userClient.auth.getSession();

        if (!session) {
            return new Response(
                JSON.stringify({ success: false, message: 'Unauthorized' }),
                { status: 401 }
            );
        }

        // Verify admin status
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

        // Fetch order to check status and Stripe payment intent
        const { data: order, error: orderError } = await userClient
            .from('orders')
            .select('status, total_amount, stripe_payment_intent_id')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return new Response(
                JSON.stringify({ success: false, message: 'Pedido no encontrado' }),
                { status: 404 }
            );
        }

        // If the order was already paid, refund in Stripe first
        let stripeRefundId: string | null = null;
        if (PAID_STATUSES.includes(order.status) && order.stripe_payment_intent_id) {
            const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
            if (!stripeSecretKey) {
                return new Response(
                    JSON.stringify({ success: false, message: 'Stripe no configurado' }),
                    { status: 500 }
                );
            }
            const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-12-15.clover' as any });

            try {
                const refund = await stripe.refunds.create({
                    payment_intent: order.stripe_payment_intent_id,
                    amount: order.total_amount, // céntimos
                    metadata: {
                        order_id: orderId,
                        admin_id: session.user.id,
                        reason: notes || 'Cancelado por admin',
                    },
                });

                if (!['succeeded', 'pending'].includes(refund.status)) {
                    return new Response(
                        JSON.stringify({ success: false, message: `Error en Stripe al reembolsar: ${refund.status}` }),
                        { status: 500 }
                    );
                }

                stripeRefundId = refund.id;
                console.log('[CancelOrder] Stripe refund created:', refund.id, 'status:', refund.status);
            } catch (stripeErr: any) {
                console.error('[CancelOrder] Stripe refund error:', stripeErr);
                return new Response(
                    JSON.stringify({ success: false, message: `Error de Stripe: ${stripeErr.message}` }),
                    { status: 500 }
                );
            }
        }

        // Call RPC using authenticated client (SECURITY DEFINER handles permissions)
        const cancelNotes = stripeRefundId
            ? `${notes || 'Cancelado por admin'} | Reembolso Stripe: ${stripeRefundId}`
            : notes || 'Cancelado por admin';

        const { data: result, error: rpcError } = await userClient.rpc(
            'admin_cancel_order_atomic',
            {
                p_order_id: orderId,
                p_admin_id: session.user.id,
                p_notes: cancelNotes
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

        return new Response(
            JSON.stringify({ success: true, data: result, stripeRefundId }),
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
