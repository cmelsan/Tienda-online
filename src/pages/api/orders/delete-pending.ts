import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

/**
 * DELETE /api/orders/delete-pending?orderId=xxx
 *
 * Deletes an order that is still in 'awaiting_payment' status.
 * Uses service role key to bypass RLS.
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
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('[delete-pending] Missing Supabase config');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers });
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
        // Only operate on awaiting_payment orders (safety check)
        const { data: order } = await supabase
            .from('orders')
            .select('id, status')
            .eq('id', orderId)
            .eq('status', 'awaiting_payment')
            .single();

        if (!order) {
            // Already paid/cancelled or not found — nothing to do
            return new Response(JSON.stringify({ success: true, message: 'Order not found or already processed' }), { status: 200, headers });
        }

        // Delete items first (FK constraint)
        await supabase.from('order_items').delete().eq('order_id', orderId);

        // Delete the order (extra safety: only if still awaiting_payment)
        const { error: deleteError } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId)
            .eq('status', 'awaiting_payment');

        if (deleteError) {
            console.error('[delete-pending] Error deleting order:', deleteError);
            return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers });
        }

        console.log('[delete-pending] Deleted abandoned order:', orderId);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });

    } catch (err: any) {
        console.error('[delete-pending] Exception:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
};
