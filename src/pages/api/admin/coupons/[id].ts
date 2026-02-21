import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * PUT /api/admin/coupons/[id] - Update a coupon
 * DELETE /api/admin/coupons/[id] - Delete a coupon
 */

export const PUT: APIRoute = async (context) => {
    try {
        const { params } = context;
        const couponId = params.id;
        if (!couponId) {
            return new Response(JSON.stringify({ error: 'ID del cupón requerido' }), { status: 400 });
        }

        const dbClient = await createServerSupabaseClient(context, true);
        const { data: { session } } = await dbClient.auth.getSession();
        if (!session) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
        }

        const data = await context.request.json();
        
        const code = data.code as string;
        const description = data.description as string;
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
            return new Response(
                JSON.stringify({ error: 'El código y el valor de descuento son requeridos' }), 
                { status: 400 }
            );
        }

        // Get the existing coupon to check its discount type
        const { data: existingCoupon, error: fetchError } = await dbClient
            .from('coupons')
            .select('discount_type')
            .eq('id', couponId)
            .single();

        if (fetchError || !existingCoupon) {
            return new Response(
                JSON.stringify({ error: 'Cupón no encontrado' }), 
                { status: 404 }
            );
        }

        // Convertir a centavos si es tipo fijo
        const finalDiscountValue = existingCoupon.discount_type === 'fixed' 
            ? discountValue * 100 
            : discountValue;

        const { error: updateError } = await dbClient
            .from('coupons')
            .update({
                code: code.toUpperCase(),
                description: description || null,
                discount_value: finalDiscountValue,
                max_uses: maxUses,
                min_purchase_amount: minPurchaseAmount * 100,
                max_discount_amount: maxDiscountAmount,
                is_active: isActive,
                valid_until: validUntil ? new Date(validUntil).toISOString() : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', couponId);

        if (updateError) {
            return new Response(
                JSON.stringify({ error: `Error: ${updateError.message}` }), 
                { status: 400 }
            );
        }

        return new Response(JSON.stringify({ success: true, message: 'Cupón actualizado exitosamente' }), {
            status: 200,
        });
    } catch (error) {
        console.error('Error updating coupon:', error);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500,
        });
    }
};

export const DELETE: APIRoute = async (context) => {
    try {
        const { params } = context;
        const couponId = params.id;
        if (!couponId) {
            return new Response(JSON.stringify({ error: 'ID del cupón requerido' }), { status: 400 });
        }

        const dbClient = await createServerSupabaseClient(context, true);
        const { data: { session } } = await dbClient.auth.getSession();
        if (!session) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
        }

        // Verify coupon exists
        const { data: coupon, error: fetchError } = await dbClient
            .from('coupons')
            .select('id')
            .eq('id', couponId)
            .single();

        if (fetchError || !coupon) {
            return new Response(
                JSON.stringify({ error: 'Cupón no encontrado' }), 
                { status: 404 }
            );
        }

        // Delete the coupon
        const { error: deleteError } = await dbClient
            .from('coupons')
            .delete()
            .eq('id', couponId);

        if (deleteError) {
            return new Response(
                JSON.stringify({ error: `Error: ${deleteError.message}` }), 
                { status: 400 }
            );
        }

        return new Response(JSON.stringify({ success: true, message: 'Cupón eliminado exitosamente' }), {
            status: 200,
        });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500,
        });
    }
};
