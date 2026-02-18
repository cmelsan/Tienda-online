import type { APIRoute } from 'astro';
import { createServerSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, newStatus } = await request.json();

        console.log('[API] updateStatus called with:', { orderId, newStatus });

        if (!orderId || !newStatus) {
            return new Response(JSON.stringify({ success: false, message: 'Order ID and status are required' }), { status: 400 });
        }

        // First, verify the user is logged in and is an admin
        const userClient = await createServerSupabaseClient({ cookies });
        const { data: { session } } = await userClient.auth.getSession();
        
        console.log('[API] Session user:', session?.user?.email);
        if (!session) {
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
        }

        // Validate status
        const validStatuses = ['awaiting_payment', 'paid', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned', 'partially_returned', 'refunded', 'partially_refunded'];
        if (!validStatuses.includes(newStatus)) {
            return new Response(JSON.stringify({ success: false, message: `Invalid status: ${newStatus}` }), { status: 400 });
        }

        // Check if user is admin by checking profiles table
        console.log('[API] Checking if user is admin...');
        const { data: profile, error: profileError } = await userClient
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();

        console.log('[API] Profile check:', { profile, error: profileError?.message });

        if (profileError || !profile?.is_admin) {
            console.error('[API] User is not admin or profile lookup failed');
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized: Admin access required' }), { status: 403 });
        }

        // Now use the admin client to perform the actual update (bypasses RLS)
        const adminClient = getAdminSupabaseClient();
        
        if (!adminClient) {
            console.error('[API] Admin client not available - SUPABASE_SERVICE_ROLE_KEY not configured');
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'Server misconfiguration: Admin operations not available'
            }), { status: 500 });
        }

        console.log('[API] Using admin client to update order...');
        const { error: updateError } = await adminClient
            .from('orders')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (updateError) {
            console.error('[API] Update error:', updateError);
            return new Response(JSON.stringify({ 
                success: false, 
                message: `Error actualizando pedido: ${updateError.message}`,
                details: updateError.details
            }), { status: 500 });
        }

        console.log('[API] Update successful for order:', orderId);

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Estado del pedido actualizado exitosamente'
        }), { status: 200 });

    } catch (err: any) {
        console.error('[API] Catch error:', err);
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
    }
};
