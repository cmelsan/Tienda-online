import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * DELETE /api/orders/delete-pending?orderId=xxx
 *
 * Deletes an order that is still in 'awaiting_payment' status.
 * Called automatically when a user returns from Stripe without paying.
 * Safe to delete because: no payment was collected, no stock was deducted.
 */
export const DELETE: APIRoute = async (context) => {
    const { request } = context;

    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
        return new Response(JSON.stringify({ error: 'Missing orderId' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const supabase = await createServerSupabaseClient(context);

        // Verify the order exists and is still awaiting_payment
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('id, status, user_id')
            .eq('id', orderId)
            .eq('status', 'awaiting_payment')
            .single();

        if (fetchError || !order) {
            // Order not found or already paid/cancelled — nothing to do
            return new Response(JSON.stringify({ success: true, message: 'Order not found or already processed' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // If order belongs to a logged-in user, verify identity
        const { data: { user } } = await supabase.auth.getUser();
        if (order.user_id && user && order.user_id !== user.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Delete order items first (FK constraint)
        await supabase.from('order_items').delete().eq('order_id', orderId);

        // Delete the order
        const { error: deleteError } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId)
            .eq('status', 'awaiting_payment'); // Safety: only delete if still pending

        if (deleteError) {
            console.error('[delete-pending] Error deleting order:', deleteError);
            return new Response(JSON.stringify({ error: 'Failed to delete order' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log('[delete-pending] Deleted abandoned order:', orderId);
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('[delete-pending] Exception:', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
