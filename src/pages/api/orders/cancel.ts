import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';
import Stripe from 'stripe';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId } = await request.json();

        if (!orderId) {
            return new Response(
                JSON.stringify({ success: false, message: 'Order ID is required' }),
                { status: 400 }
            );
        }

        const userClient = await createServerSupabaseClient({ cookies });
        const { data: { user } } = await userClient.auth.getUser();

        if (!user) {
            return new Response(
                JSON.stringify({ success: false, message: 'Unauthorized' }),
                { status: 401 }
            );
        }

        // Verify order belongs to user and fetch status + stripe intent
        const { data: order } = await userClient
            .from('orders')
            .select('user_id, status, total_amount, stripe_payment_intent_id')
            .eq('id', orderId)
            .single();

        if (!order || order.user_id !== user.id) {
            return new Response(
                JSON.stringify({ success: false, message: 'Forbidden' }),
                { status: 403 }
            );
        }

        // If order was paid, refund in Stripe before cancelling
        let stripeRefundId: string | null = null;
        if (order.status === 'paid' && order.stripe_payment_intent_id) {
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
                        reason: 'Cancelado por el cliente',
                    },
                });

                if (!['succeeded', 'pending'].includes(refund.status)) {
                    return new Response(
                        JSON.stringify({ success: false, message: `Error al reembolsar en Stripe: ${refund.status}` }),
                        { status: 500 }
                    );
                }

                stripeRefundId = refund.id;
                console.log('[CancelOrder] Stripe refund created:', refund.id, 'status:', refund.status);
            } catch (stripeErr: any) {
                console.error('[CancelOrder] Stripe refund error:', stripeErr);
                return new Response(
                    JSON.stringify({ success: false, message: `Error de Stripe al reembolsar: ${stripeErr.message}` }),
                    { status: 500 }
                );
            }
        }

        // Call RPC: admin_cancel_order_atomic — user initiates cancellation
        const cancelNotes = stripeRefundId
            ? `Cancelado por el cliente | Reembolso Stripe: ${stripeRefundId}`
            : 'Cancelado por el cliente';

        const { data: result, error: rpcError } = await userClient.rpc(
            'admin_cancel_order_atomic',
            {
                p_order_id: orderId,
                p_admin_id: user.id,
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
