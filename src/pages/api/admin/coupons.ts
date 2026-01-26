import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        
        const code = data.code as string;
        const description = data.description as string;
        const discountType = data.discountType as string;
        const discountValue = parseFloat(data.discountValue as string);
        const maxUses = data.maxUses ? parseInt(data.maxUses as string) : null;
        const minPurchaseAmount = parseFloat(data.minPurchaseAmount as string) || 0;
        const maxDiscountAmount = data.maxDiscountAmount 
            ? parseFloat(data.maxDiscountAmount as string) * 100 
            : null;
        const validUntil = data.validUntil || null;
        const isActive = data.isActive === true;

        // Validación
        if (!code || !discountValue) {
            return new Response(JSON.stringify({ error: 'El código y el valor de descuento son requeridos' }), {
                status: 400,
            });
        }

        // Convertir a centavos si es tipo fijo
        const finalDiscountValue = discountType === 'fixed' ? discountValue * 100 : discountValue;

        const { data: newCoupon, error: insertError } = await supabase
            .from('coupons')
            .insert([
                {
                    code: code.toUpperCase(),
                    description: description || null,
                    discount_type: discountType,
                    discount_value: finalDiscountValue,
                    max_uses: maxUses,
                    min_purchase_amount: minPurchaseAmount * 100,
                    max_discount_amount: maxDiscountAmount,
                    is_active: isActive,
                    valid_until: validUntil ? new Date(validUntil).toISOString() : null,
                }
            ])
            .select();

        if (insertError) {
            return new Response(JSON.stringify({ error: `Error: ${insertError.message}` }), {
                status: 400,
            });
        }

        return new Response(JSON.stringify({ success: true, coupon: newCoupon }), {
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500,
        });
    }
};
