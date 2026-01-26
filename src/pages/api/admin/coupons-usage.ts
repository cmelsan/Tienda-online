import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

export const GET: APIRoute = async ({ request, cookies }) => {
    try {
        const supabase = await createServerSupabaseClient({ cookies }, true); // isAdmin = true

        // Get session to verify admin
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if user has admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profile?.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get all coupons with usage statistics
        const { data: coupons, error: couponsError } = await supabase
            .from('coupons')
            .select(`
                id,
                code,
                discount_type,
                discount_value,
                max_discount_amount,
                max_uses,
                current_uses,
                is_active,
                valid_from,
                valid_until,
                min_purchase_amount,
                created_at
            `)
            .order('created_at', { ascending: false });

        if (couponsError) {
            throw couponsError;
        }

        // For each coupon, get detailed usage information
        const detailedCoupons = await Promise.all(
            (coupons || []).map(async (coupon) => {
                const { data: usage, error: usageError } = await supabase
                    .from('coupon_usage')
                    .select(`
                        id,
                        user_id,
                        order_id,
                        discount_applied,
                        created_at,
                        orders (
                            email,
                            total_amount,
                            status
                        )
                    `)
                    .eq('coupon_id', coupon.id)
                    .order('created_at', { ascending: false });

                if (usageError) {
                    console.error('Error fetching usage for coupon:', coupon.id, usageError);
                    return { ...coupon, usage: [], total_discount_amount: 0, usage_count: 0 };
                }

                // Calculate total discount amount
                const totalDiscountAmount = (usage || []).reduce((sum, u) => sum + (u.discount_applied || 0), 0);

                return {
                    ...coupon,
                    usage: usage || [],
                    total_discount_amount: totalDiscountAmount,
                    usage_count: usage?.length || 0
                };
            })
        );

        return new Response(JSON.stringify({
            success: true,
            coupons: detailedCoupons
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Admin Coupons Usage API] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Internal server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
