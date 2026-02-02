import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, newStatus } = await request.json();

        if (!orderId || !newStatus) {
            return new Response(JSON.stringify({ success: false, message: 'Order ID and status are required' }), { status: 400 });
        }

        const supabase = await createServerSupabaseClient({ cookies });

        // Verify session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
        }

        // Call RPC to update order status
        console.log('[Admin] Calling update_order_status RPC with:', { orderId, newStatus });
        const { data, error } = await supabase.rpc('update_order_status', {
            p_order_id: orderId,
            p_new_status: newStatus
        });

        if (error) {
            console.error('[Admin] RPC error:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            return new Response(JSON.stringify({ 
                success: false, 
                message: `Error actualizando pedido: ${error.message}`,
                details: error.details,
                hint: error.hint
            }), { status: 500 });
        }

        console.log('[Admin] RPC success:', data);

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Order status updated',
            data: data
        }), { status: 200 });

    } catch (err: any) {
        console.error('[Admin] API error:', err);
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
    }
};
