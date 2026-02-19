import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

/**
 * DELETE /api/orders/delete-pending?orderId=xxx
 *
 * Deletes an order that is still in 'awaiting_payment' status.
 * Uses anon key + SECURITY DEFINER RPC to bypass RLS without needing service role key.
 * Safe to delete because: no payment was collected, no stock was deducted.
 */
export const DELETE: APIRoute = async ({ request }) => {
    const headers = { 'Content-Type': 'application/json' };

    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
        return new Response(JSON.stringify({ error: 'Missing orderId' }), { status: 400, headers });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[delete-pending] Missing Supabase config');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers });
    }

    // Use anon key — the RPC function has SECURITY DEFINER so it bypasses RLS server-side
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
        const { data, error } = await supabase.rpc('delete_pending_order', {
            p_order_id: orderId
        });

        if (error) {
            console.error('[delete-pending] RPC error:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
        }

        if (!data?.success) {
            console.warn('[delete-pending] RPC returned failure:', data);
            return new Response(JSON.stringify({ error: data?.error || 'No se pudo eliminar el pedido' }), { status: 400, headers });
        }

        console.log('[delete-pending] Deleted abandoned order:', orderId);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });

    } catch (err: any) {
        console.error('[delete-pending] Exception:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
};
