import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { items, total, shippingAddress, guestEmail } = await request.json();

        // Create server-side Supabase client
        const supabase = await createServerSupabaseClient({ cookies });

        // Get session to verify user
        const { data: { session } } = await supabase.auth.getSession();

        console.log('[Order API] Session:', session ? 'Found' : 'Not found');
        console.log('[Order API] User ID:', session?.user?.id || 'none');
        console.log('[Order API] Guest Email:', guestEmail || 'none');

        // Call RPC - server will use auth.uid() correctly
        const { data, error } = await supabase.rpc('create_order', {
            p_items: items,
            p_total_amount: total,
            p_shipping_address: shippingAddress,
            p_guest_email: guestEmail
        });

        if (error) {
            console.error('[Order API] RPC Error:', error);
            return new Response(JSON.stringify({
                success: false,
                message: error.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (data && data.success) {
            console.log('[Order API] Success! Order ID:', data.order_id);
            return new Response(JSON.stringify({
                success: true,
                order_id: data.order_id
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            console.error('[Order API] Data error:', data);
            return new Response(JSON.stringify({
                success: false,
                message: data?.message || 'Unknown error'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (err: any) {
        console.error('[Order API] Exception:', err);
        return new Response(JSON.stringify({
            success: false,
            message: err.message || 'Internal server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
