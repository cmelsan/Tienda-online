import type { APIRoute } from 'astro';
import { createServerSupabaseClient, createTokenClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, newStatus } = await request.json();

        if (!orderId || !newStatus) {
            return new Response(JSON.stringify({ success: false, message: 'Order ID and status are required' }), { status: 400 });
        }

        // Verify the user is logged in
        const userClient = await createServerSupabaseClient({ cookies });
        const { data: { session } } = await userClient.auth.getSession();

        if (!session) {
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
        }

        // Validate status
        const validStatuses = ['awaiting_payment', 'paid', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned', 'partially_returned', 'refunded', 'partially_refunded'];
        if (!validStatuses.includes(newStatus)) {
            return new Response(JSON.stringify({ success: false, message: `Invalid status: ${newStatus}` }), { status: 400 });
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await userClient
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile?.is_admin) {
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized: Admin access required' }), { status: 403 });
        }

        // Usar RPC SECURITY DEFINER que puede actualizar cualquier pedido sin service role key
        // IMPORTANTE: ejecutar fix_admin_rls.sql en Supabase si no lo has hecho
        const tokenClient = createTokenClient(session.access_token);
        const { data: result, error: rpcError } = await tokenClient.rpc('admin_update_order_status', {
            p_order_id: orderId,
            p_new_status: newStatus,
        });

        if (rpcError) {
            return new Response(JSON.stringify({
                success: false,
                message: `Error actualizando pedido: ${rpcError.message}`,
            }), { status: 500 });
        }

        if (result && result.success === false) {
            return new Response(JSON.stringify({ success: false, message: result.error }), { status: 400 });
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Estado del pedido actualizado exitosamente'
        }), { status: 200 });

    } catch (err: any) {
        console.error('[API] updateStatus error:', err.message);
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
    }
};
