/**
 * POST /api/mobile-admin/process-refund
 *
 * Endpoint exclusivo para la app Flutter.
 * Autentica al admin mediante JWT de Supabase (Authorization: Bearer <token>)
 * en lugar de cookies del navegador.
 *
 * Body JSON: { orderId: string, notes?: string, refundAmount?: number }
 *   - refundAmount en euros (ej: 12.50). Si no se envía = reembolso total.
 */

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabase, createTokenClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
    console.log('[MobileRefund] ── Request received ──');

    // ── 0. VARIABLES DE ENTORNO ─────────────────────────────────
    const runtimeEnv = typeof process !== 'undefined' ? process.env : {} as any;

    const stripeSecretKey = runtimeEnv.STRIPE_SECRET_KEY
        ?? import.meta.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
        console.error('[MobileRefund] Missing STRIPE_SECRET_KEY');
        return errorResponse('Server configuration error', 500);
    }

    const stripe = new Stripe(stripeSecretKey as string, {
        apiVersion: '2025-12-15.clover' as any,
    });

    // ── 1. AUTENTICACIÓN POR JWT ────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    console.log('[MobileRefund] Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse('Authorization header required (Bearer <token>)', 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Verificar JWT usando el cliente anon (igual que mobile-payment)
    let userId: string;
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
        if (authError || !user) {
            console.error('[MobileRefund] Token verification failed:', authError?.message);
            return errorResponse('Token inválido o expirado', 401);
        }
        userId = user.id;
        console.log('[MobileRefund] User verified:', userId);
    } catch (authErr: any) {
        console.error('[MobileRefund] Auth exception:', authErr.message);
        return errorResponse('Error verificando token', 401);
    }

    // Verificar que es admin - usar createTokenClient para respetar RLS
    const tokenClient = createTokenClient(accessToken);
    const { data: profile, error: profileError } = await tokenClient
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

    console.log('[MobileRefund] Profile check:', { profile, profileError: profileError?.message });

    if (profileError || !profile?.is_admin) {
        return errorResponse('Se requiere acceso de administrador', 403);
    }

    // ── 2. PARSEAR BODY ─────────────────────────────────────────
    let body: { orderId?: string; notes?: string; refundAmount?: number };
    try {
        body = await request.json();
    } catch {
        return errorResponse('Invalid JSON body', 400);
    }

    const { orderId, notes, refundAmount } = body;
    console.log('[MobileRefund] Request body:', { orderId, notes, refundAmount });

    if (!orderId) {
        return errorResponse('ID del pedido requerido', 400);
    }

    // ── 3. OBTENER PEDIDO ───────────────────────────────────────
    const { data: order, error: orderError } = await tokenClient
        .from('orders')
        .select('id, order_number, total_amount, stripe_payment_intent_id, customer_name, guest_email, user_id')
        .eq('id', orderId)
        .single();

    if (orderError || !order) {
        console.error('[MobileRefund] Order not found:', orderError?.message);
        return errorResponse('Pedido no encontrado', 404);
    }

    if (!order.stripe_payment_intent_id) {
        return errorResponse('Este pedido no tiene un ID de pago de Stripe', 400);
    }

    console.log('[MobileRefund] Order found:', order.order_number, 'PI:', order.stripe_payment_intent_id);

    // ── 4. CALCULAR MONTO ───────────────────────────────────────
    let finalRefundAmountCents: number | undefined = undefined;
    let isPartialRefund = false;

    if (refundAmount !== undefined && refundAmount !== null) {
        if (refundAmount <= 0) {
            return errorResponse('El monto de reembolso debe ser mayor a 0', 400);
        }
        // refundAmount viene en euros → convertir a céntimos
        finalRefundAmountCents = Math.round(refundAmount * 100);
        isPartialRefund = true;
    }

    const newStatus = isPartialRefund ? 'partially_refunded' : 'refunded';
    console.log('[MobileRefund] Refund type:', isPartialRefund ? 'partial' : 'full', 'cents:', finalRefundAmountCents);

    // ── 5. PROCESAR REEMBOLSO EN STRIPE ─────────────────────────
    let stripeRefund;
    try {
        const refundParams: any = {
            payment_intent: order.stripe_payment_intent_id,
            metadata: {
                order_id: orderId,
                admin_id: userId,
                reason: notes || 'Reembolso desde app móvil',
                source: 'flutter_app',
            },
        };
        if (finalRefundAmountCents !== undefined) {
            refundParams.amount = finalRefundAmountCents;
        }

        stripeRefund = await stripe.refunds.create(refundParams);

        if (!['succeeded', 'pending'].includes(stripeRefund.status as string)) {
            return errorResponse(
                `Error al procesar reembolso en Stripe: ${stripeRefund.status}`,
                500,
            );
        }

        console.log('[MobileRefund] Stripe refund successful:', stripeRefund.id, 'amount:', stripeRefund.amount);
    } catch (stripeError: any) {
        console.error('[MobileRefund] Stripe refund error:', stripeError.message);
        return errorResponse(`Error de Stripe: ${stripeError.message}`, 500);
    }

    // ── 6. ACTUALIZAR ESTADO EN BD VÍA RPC ──────────────────────
    const refundNotes = notes ||
        `Reembolsado €${((finalRefundAmountCents ?? stripeRefund.amount ?? 0) / 100).toFixed(2)} por Stripe: ${stripeRefund.id}`;

    const { data: rpcResult, error: rpcError } = await tokenClient.rpc(
        'admin_process_return',
        {
            p_order_id: orderId,
            p_admin_id: userId,
            p_new_status: newStatus,
            p_restore_stock: false,
            p_notes: refundNotes,
        },
    );

    if (rpcError || !rpcResult?.success) {
        console.error('[MobileRefund] RPC error:', rpcError?.message, rpcResult);
        return errorResponse(
            rpcError?.message || rpcResult?.error || 'Error al actualizar estado del pedido',
            500,
        );
    }

    console.log('[MobileRefund] RPC success, order updated to:', newStatus);

    // ── 7. REGISTRAR EN LOG (no bloqueante) ─────────────────────
    tokenClient
        .from('refunds_log')
        .insert({
            order_id: orderId,
            stripe_refund_id: stripeRefund.id,
            amount: finalRefundAmountCents ?? stripeRefund.amount,
            admin_id: userId,
            notes: notes,
            created_at: new Date().toISOString(),
        })
        .then(({ error }) => {
            if (error) console.log('[MobileRefund] Could not log refund (non-critical):', error.message);
        });

    // ── 8. RESPUESTA ────────────────────────────────────────────
    console.log('[MobileRefund] ── Done ──');
    return new Response(
        JSON.stringify({
            success: true,
            message: 'Reembolso procesado exitosamente',
            data: {
                order_id: orderId,
                stripe_refund_id: stripeRefund.id,
                amount: stripeRefund.amount,
                status: newStatus,
            },
        }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        },
    );
};

// ── CORS preflight ──────────────────────────────────────────────
export const OPTIONS: APIRoute = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
};

function errorResponse(message: string, status: number): Response {
    console.error(`[MobileRefund] Error ${status}: ${message}`);
    return new Response(JSON.stringify({ success: false, message }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
