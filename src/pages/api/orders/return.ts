import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, reason } = await request.json();

        if (!orderId || !reason) {
            return new Response(JSON.stringify({ success: false, message: 'Order ID and reason are required' }), { status: 400 });
        }

        const supabase = await createServerSupabaseClient({ cookies });

        // Verify session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
        }

        // Call RPC
        const { data, error } = await supabase.rpc('request_return', {
            p_order_id: orderId,
            p_reason: reason
        });

        if (error) {
            console.error('Return request error:', error);
            return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
        }

        return new Response(JSON.stringify(data), { status: 200 });

    } catch (err: any) {
        console.error('Return API error:', err);
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
    }
};
