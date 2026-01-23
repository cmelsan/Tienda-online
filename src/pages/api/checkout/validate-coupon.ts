import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { validateCoupon, calculateDiscount } from '@/lib/coupons';

export const POST: APIRoute = async ({ request }) => {
    try {
        const { code, totalAmount } = await request.json();

        if (!code || totalAmount === undefined) {
            return new Response(JSON.stringify({ error: 'Missing code or totalAmount' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate coupon
        const validation = await validateCoupon(code, totalAmount);

        if (!validation.valid || !validation.coupon) {
            return new Response(JSON.stringify({
                valid: false,
                error: validation.error
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Calculate discount
        const discount = calculateDiscount(validation.coupon, totalAmount);

        return new Response(JSON.stringify({
            valid: true,
            coupon: {
                id: validation.coupon.id,
                code: validation.coupon.code,
                discount_type: validation.coupon.discount_type,
                discount_value: validation.coupon.discount_value,
                discount_amount: discount
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
