import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { items, total, shippingAddress, email, guestEmail, couponId, discountAmount, customerName } = await request.json();

        // Create server-side Supabase client
        const supabase = await createServerSupabaseClient({ cookies });

        // Get session to verify user
        const { data: { session } } = await supabase.auth.getSession();

        console.log('[Order API] Session:', session ? 'Found' : 'Not found');
        console.log('[Order API] User ID:', session?.user?.id || 'none');
        console.log('[Order API] Email (guest):', email || guestEmail || 'none');
        console.log('[Order API] Customer Name:', customerName || 'none');
        console.log('[Order API] Coupon ID:', couponId || 'none');

        // Call RPC - use email or guestEmail, prioritize email (from new code)
        const finalEmail = email || guestEmail;
        
        const { data, error } = await supabase.rpc('create_order', {
            p_items: items,
            p_total_amount: total,
            p_shipping_address: shippingAddress,
            p_guest_email: finalEmail,
            p_customer_name: customerName
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

            // NOTE: Coupon usage and stock deduction are handled by the Stripe webhook
            // after payment is confirmed, to avoid recording usage for abandoned payments.

            return new Response(JSON.stringify({
                success: true,
                order_id: data.order_id,
                order_number: data.order_number
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
