import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { validateCoupon, calculateDiscount } from '@/lib/coupons';
import type { CartItemForCoupon } from '@/lib/coupons';

const DEBUG = import.meta.env.DEV;

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { code, totalAmount, cartItems } = await request.json();

        // Validate input
        if (!code || totalAmount === undefined || totalAmount === null) {
            return new Response(JSON.stringify({ 
                valid: false,
                error: 'Faltan datos requeridos' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Try to get user ID from session (optional)
        const supabaseClient = supabase;
        const { data: { session } } = await supabaseClient.auth.getSession();
        const userId = session?.user?.id || null;

        // Prepare cart items for validation (if provided)
        const itemsForValidation: CartItemForCoupon[] | undefined = cartItems?.map((item: any) => ({
            product: {
                id: item.product.id,
                category_id: item.product.category_id,
                price: item.product.price
            },
            quantity: item.quantity
        }));

        // Validate coupon with all checks including category restrictions
        const validation = await validateCoupon(
            code.toUpperCase(), 
            totalAmount, 
            userId,
            itemsForValidation
        );

        if (!validation.valid || !validation.coupon) {
            return new Response(JSON.stringify({
                valid: false,
                error: validation.error || 'Código inválido'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Calculate actual discount amount
        const discountAmount = calculateDiscount(validation.coupon, totalAmount);

        // Validate that discount is positive and doesn't exceed purchase amount
        if (discountAmount <= 0) {
            return new Response(JSON.stringify({
                valid: false,
                error: 'El cupón no proporciona un descuento válido'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (discountAmount > totalAmount) {
            return new Response(JSON.stringify({
                valid: false,
                error: 'El descuento no puede ser mayor que el total del carrito'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (DEBUG) {
            console.log('[Validate Coupon] Success:', {
                code: validation.coupon.code,
                discount_amount: discountAmount
            });
        }

        return new Response(JSON.stringify({
            valid: true,
            coupon: {
                id: validation.coupon.id,
                code: validation.coupon.code,
                discount_type: validation.coupon.discount_type,
                discount_value: validation.coupon.discount_value,
                discount_amount: discountAmount
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Validate Coupon API] Error:', error);
        return new Response(JSON.stringify({ 
            valid: false,
            error: 'Error del servidor al validar el cupón' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
