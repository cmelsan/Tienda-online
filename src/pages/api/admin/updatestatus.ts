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
        console.log('[API] Session user:', session?.user?.email);
        if (!session) {
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
        }

        // Validate status
        const validStatuses = ['awaiting_payment', 'paid', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned', 'refunded'];
        if (!validStatuses.includes(newStatus)) {
            return new Response(JSON.stringify({ success: false, message: `Invalid status: ${newStatus}` }), { status: 400 });
        }

        // Check if user is admin by checking profiles table
        console.log('[API] Checking if user is admin...');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();

        console.log('[API] Profile check:', { profile, error: profileError?.message });

        if (profileError || !profile?.is_admin) {
            console.error('[API] User is not admin or profile lookup failed');
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized: Admin access required' }), { status: 403 });
        }

        // Use RPC function with elevated privileges for the update
        console.log('[API] Calling update_order_status RPC...');
        const { data: rpcResult, error: rpcError } = await supabase.rpc('update_order_status', {
            p_order_id: orderId,
            p_new_status: newStatus
        });

        if (rpcError) {
            console.error('[API] RPC error:', rpcError);
            // If RPC fails, try direct update as fallback
            console.log('[API] RPC failed, trying direct update...');
            
            const { error: updateError } = await supabase
                .from('orders')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (updateError) {
                console.error('[API] Direct update also failed:', updateError);
                return new Response(JSON.stringify({ 
                    success: false, 
                    message: `Error actualizando pedido: ${updateError.message}`,
                    details: updateError.details
                }), { status: 500 });
            }
        }

        console.log('[API] Update successful');

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Order status updated',
            data: rpcResult
        }), { status: 200 });

    } catch (err: any) {
        console.error('[API] Catch error:', err);
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
    }
};
