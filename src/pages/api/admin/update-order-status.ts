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

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile?.is_admin) {
            return new Response(JSON.stringify({ success: false, message: 'Admin access required' }), { status: 403 });
        }

        // Valid statuses
        const validStatuses = ['awaiting_payment', 'paid', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned', 'refunded'];
        if (!validStatuses.includes(newStatus)) {
            return new Response(JSON.stringify({ success: false, message: 'Invalid status' }), { status: 400 });
        }

        // Update order status
        const updateData: any = { 
            status: newStatus,
            updated_at: new Date().toISOString()
        };

        // If marking as delivered, set delivered_at timestamp
        if (newStatus === 'delivered') {
            updateData.delivered_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId)
            .select()
            .single();

        if (error) {
            console.error('Update order status error:', error);
            return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
        }

        // Log status change in history
        await supabase
            .from('order_status_history')
            .insert({
                order_id: orderId,
                from_status: data.status,
                to_status: newStatus,
                changed_by: session.user.id,
                changed_by_type: 'admin'
            });

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Order status updated',
            status: newStatus
        }), { status: 200 });

    } catch (err: any) {
        console.error('Update order status API error:', err);
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
    }
};
