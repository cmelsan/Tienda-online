import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';
import Stripe from 'stripe';
import { sendEmail, getRefundProcessedTemplate } from '@/lib/brevo';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
});

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, notes, refundAmount } = await request.json();

        if (!orderId) {
            return new Response(
                JSON.stringify({ success: false, message: 'ID del pedido requerido' }),
                { status: 400 }
            );
        }

        // Verificar sesión y permisos de admin
        const userClient = await createServerSupabaseClient({ cookies }, true);
        const { data: { session } } = await userClient.auth.getSession();

        if (!session) {
            return new Response(
                JSON.stringify({ success: false, message: 'No autorizado' }),
                { status: 401 }
            );
        }

        const { data: profile, error: profileError } = await userClient
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile?.is_admin) {
            return new Response(
                JSON.stringify({ success: false, message: 'Se requiere acceso de administrador' }),
                { status: 403 }
            );
        }

        // Obtener detalles del pedido
        const { data: order, error: orderError } = await userClient
            .from('orders')
            .select('id, order_number, total_amount, stripe_payment_intent_id, customer_name, guest_email, user_id')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return new Response(
                JSON.stringify({ success: false, message: 'Pedido no encontrado' }),
                { status: 404 }
            );
        }

        // Validar que el pedido tenga payment intent de Stripe
        if (!order.stripe_payment_intent_id) {
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    message: 'Este pedido no tiene un ID de pago de Stripe registrado' 
                }),
                { status: 400 }
            );
        }

        // Determinar monto a reembolsar
        let finalRefundAmount = order.total_amount;
        
        // Si se especifica un monto parcial, validarlo
        if (refundAmount !== undefined && refundAmount !== null) {
            if (refundAmount <= 0) {
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        message: 'El monto de reembolso debe ser mayor a 0' 
                    }),
                    { status: 400 }
                );
            }

            if (refundAmount > order.total_amount) {
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        message: `El monto de reembolso (${refundAmount}) no puede exceder el total del pedido (${order.total_amount})` 
                    }),
                    { status: 400 }
                );
            }

            finalRefundAmount = refundAmount;
        }

        // Determinar si es reembolso total o parcial
        const isPartialRefund = finalRefundAmount < order.total_amount;
        const newStatus = isPartialRefund ? 'partially_refunded' : 'refunded';

        let stripeRefund;
        try {
            stripeRefund = await stripe.refunds.create({
                payment_intent: order.stripe_payment_intent_id,
                amount: Math.round(finalRefundAmount * 100),
                metadata: {
                    order_id: orderId,
                    admin_id: session.user.id,
                    reason: notes || 'Reembolso de administrador',
                }
            });

            if (stripeRefund.status !== 'succeeded') {
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        message: `Error al procesar reembolso en Stripe: ${stripeRefund.status}` 
                    }),
                    { status: 500 }
                );
            }

            console.log('[API] Stripe refund successful:', stripeRefund.id);
        } catch (stripeError: any) {
            console.error('[API] Stripe refund error:', stripeError);
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    message: `Error de Stripe: ${stripeError.message}` 
                }),
                { status: 500 }
            );
        }

        // Llamar RPC para actualizar estado en BD
        const { data: rpcResult, error: rpcError } = await userClient.rpc(
            'admin_process_return',
            {
                p_order_id: orderId,
                p_admin_id: session.user.id,
                p_new_status: newStatus,
                p_restore_stock: false,
                p_notes: notes || `Reembolsado por Stripe: ${stripeRefund.id}`
            }
        );

        if (rpcError || !rpcResult?.success) {
            console.error('[API] RPC error:', rpcError);
            return new Response(
                JSON.stringify({ 
                    success: false, 
                    message: rpcError?.message || 'Error al actualizar estado del pedido' 
                }),
                { status: 500 }
            );
        }

        // Registrar reembolso en tabla de auditoría (opcional)
        await userClient
            .from('refunds_log')
            .insert({
                order_id: orderId,
                stripe_refund_id: stripeRefund.id,
                amount: order.total_amount,
                admin_id: session.user.id,
                notes: notes,
                created_at: new Date().toISOString()
            })
            .then(({ error }) => {
                if (error) console.log('[API] Could not log refund, but Stripe refund was successful');
            });

        // Enviar email de confirmación al cliente
        let customerEmail = order.guest_email;
        let customerName = order.customer_name || 'Cliente';

        if (!customerEmail && order.user_id) {
            try {
                const { data: { user }, error: userError } = await userClient.auth.admin.getUser(order.user_id);
                if (user && !userError) {
                    customerEmail = user.email;
                    customerName = user.user_metadata?.full_name || customerName;
                }
            } catch (e) {
                console.log('[API] Could not fetch auth user');
            }
        }

        if (customerEmail) {
            const emailTemplate = getRefundProcessedTemplate(
                customerName,
                order.order_number || orderId.slice(0, 8).toUpperCase(),
                order.total_amount
            );

            await sendEmail({
                to: customerEmail,
                subject: `Reembolso confirmado para tu pedido #${order.order_number || orderId.slice(0, 8).toUpperCase()}`,
                htmlContent: emailTemplate
            });

            console.log('[API] Refund confirmation email sent to:', customerEmail);
        }

        return new Response(
            JSON.stringify({ 
                success: true, 
                message: 'Reembolso procesado exitosamente',
                data: {
                    order_id: orderId,
                    stripe_refund_id: stripeRefund.id,
                    amount: order.total_amount,
                    status: 'refunded'
                }
            }),
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
