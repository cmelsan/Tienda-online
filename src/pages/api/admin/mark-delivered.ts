import type { APIRoute } from 'astro';
import { createServerSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, notes } = await request.json();

        if (!orderId) {
            return new Response(
                JSON.stringify({ success: false, message: 'Order ID is required' }),
                { status: 400 }
            );
        }

        // Use admin cookies (isAdmin = true)
        const userClient = await createServerSupabaseClient({ cookies }, true);
        const { data: { session } } = await userClient.auth.getSession();

        if (!session) {
            return new Response(
                JSON.stringify({ success: false, message: 'Unauthorized' }),
                { status: 401 }
            );
        }

        const { data: profile, error: profileError } = await userClient
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile?.is_admin) {
            return new Response(
                JSON.stringify({ success: false, message: 'Admin access required' }),
                { status: 403 }
            );
        }

        // Call RPC using authenticated client (SECURITY DEFINER handles permissions)
        const { data: result, error: rpcError } = await userClient.rpc(
            'admin_mark_delivered',
            {
                p_order_id: orderId,
                p_admin_id: session.user.id,
                p_notes: notes || 'Marked as delivered'
            }
        );

        if (rpcError) {
            console.error('[API] RPC error:', rpcError);
            return new Response(
                JSON.stringify({ success: false, message: rpcError.message }),
                { status: 500 }
            );
        }

        if (!result.success) {
            return new Response(
                JSON.stringify({ success: false, message: result.error, code: result.code }),
                { status: 400 }
            );
        }

        return new Response(
            JSON.stringify({ success: true, data: result }),
            { status: 200 }
        );

    } catch (err: any) {
        console.error('[API] Error:', err);
        return new Response(
            JSON.stringify({ success: false, message: err.message }),
            { status: 500 }
        );
    }
};
