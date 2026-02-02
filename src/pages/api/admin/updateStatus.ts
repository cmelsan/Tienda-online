import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, newStatus } = await request.json();

        console.log('[API] updateStatus called with:', { orderId, newStatus });

        if (!orderId || !newStatus) {
            return new Response(JSON.stringify({ success: false, message: 'Order ID and status are required' }), { status: 400 });
        }

        const supabase = await createServerSupabaseClient({ cookies });

        // Verify session
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[API] Session:', session?.user?.email);
        if (!session) {
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
        }

        // Validate status
        const validStatuses = ['awaiting_payment', 'paid', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned', 'refunded'];
        if (!validStatuses.includes(newStatus)) {
            return new Response(JSON.stringify({ success: false, message: `Invalid status: ${newStatus}` }), { status: 400 });
        }

        // Update order status directly
        console.log('[API] Updating order status directly in database...');
        const { data, error } = await supabase
            .from('orders')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .select();

        if (error) {
            console.error('[API] Update error:', error);
            return new Response(JSON.stringify({ 
                success: false, 
                message: `Error actualizando pedido: ${error.message}`,
                details: error.details,
                hint: error.hint
            }), { status: 500 });
        }

        if (!data || data.length === 0) {
            console.error('[API] Order not found');
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'Order not found'
            }), { status: 404 });
        }

        console.log('[API] Update success:', data);

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Order status updated',
            data: data[0]
        }), { status: 200 });

    } catch (err: any) {
        console.error('[API] Catch error:', err);
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
    }
};
