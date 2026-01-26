import { supabase } from './supabase';

export interface CouponValidationResult {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_discount_amount?: number | null;
    min_purchase_amount: number;
  };
  error?: string;
}

/**
 * Validates a coupon code with comprehensive checks
 * @param code - The coupon code to validate
 * @param totalAmount - The total amount in cents
 * @param userId - Optional user ID to check if user already used this coupon
 * @returns Validation result with coupon details or error message
 */
export async function validateCoupon(
  code: string,
  totalAmount: number,
  userId?: string | null
): Promise<CouponValidationResult> {
  try {
    // Validate input
    if (!code || !code.trim()) {
      return {
        valid: false,
        error: 'Debes ingresar un código de descuento',
      };
    }

    if (totalAmount <= 0) {
      return {
        valid: false,
        error: 'El monto del carrito debe ser mayor a 0',
      };
    }

    // Search for coupon (case-insensitive)
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !coupon) {
      return {
        valid: false,
        error: 'Código de descuento no válido o no existe',
      };
    }

    // Check if coupon is active
    if (!coupon.is_active) {
      return {
        valid: false,
        error: 'Este cupón no está disponible actualmente',
      };
    }

    // Check start date (valid_from)
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      const startDate = new Date(coupon.valid_from).toLocaleDateString('es-ES');
      return {
        valid: false,
        error: `Este cupón será válido a partir del ${startDate}`,
      };
    }

    // Check expiration date (valid_until)
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      const expiredDate = new Date(coupon.valid_until).toLocaleDateString('es-ES');
      return {
        valid: false,
        error: `Este cupón expiró el ${expiredDate}`,
      };
    }

    // Check max uses limit (global)
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return {
        valid: false,
        error: `Este cupón ha alcanzado el máximo de usos (${coupon.max_uses})`,
      };
    }

    // Check minimum purchase amount
    if (coupon.min_purchase_amount && totalAmount < coupon.min_purchase_amount) {
      const minAmount = (coupon.min_purchase_amount / 100).toFixed(2);
      const currentAmount = (totalAmount / 100).toFixed(2);
      return {
        valid: false,
        error: `Compra mínima de €${minAmount} requerida. Tu carrito tiene €${currentAmount}`,
      };
    }

    // Optional: Check if user has already used this coupon (if userId provided)
    if (userId) {
      const { data: userUsage, error: usageError } = await supabase
        .from('coupon_usage')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId)
        .single();

      // If no error and data exists, user has already used this coupon
      if (!usageError && userUsage) {
        // You can customize this behavior:
        // 1. Allow multiple uses per user
        // 2. Restrict to one use per user
        // For now, we log it but allow it (modify based on your business rules)
        console.log('[Coupon] User has previously used this coupon:', { couponId: coupon.id, userId });
      }
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_discount_amount: coupon.max_discount_amount,
        min_purchase_amount: coupon.min_purchase_amount,
      },
    };
  } catch (err: any) {
    console.error('[Coupon] Validation error:', err);
    return {
      valid: false,
      error: 'Error al validar el cupón. Por favor intenta más tarde',
    };
  }
}

export function calculateDiscount(
  coupon: {
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_discount_amount?: number | null;
  },
  totalAmount: number
): number {
  if (coupon.discount_type === 'fixed') {
    return Math.min(coupon.discount_value, totalAmount);
  }

  // Porcentaje
  let discount = (totalAmount * coupon.discount_value) / 100;

  // Aplicar límite máximo si existe
  if (coupon.max_discount_amount) {
    discount = Math.min(discount, coupon.max_discount_amount);
  }

  return Math.round(discount);
}

export async function incrementCouponUsage(couponId: string, orderId: string, userId: string | null, discountApplied: number) {
  try {
    // Step 1: Incrementar el contador de usos
    const { data: coupon, error: fetchError } = await supabase
      .from('coupons')
      .select('current_uses')
      .eq('id', couponId)
      .single();

    if (fetchError) {
      throw new Error(`Error fetching coupon: ${fetchError.message}`);
    }

    if (!coupon) {
      throw new Error(`Coupon not found: ${couponId}`);
    }

    const { error: updateError } = await supabase
      .from('coupons')
      .update({ current_uses: coupon.current_uses + 1 })
      .eq('id', couponId);

    if (updateError) {
      throw new Error(`Error updating coupon usage: ${updateError.message}`);
    }

    // Step 2: Registrar el uso en la tabla coupon_usage
    const { error: insertError } = await supabase
      .from('coupon_usage')
      .insert([
        {
          coupon_id: couponId,
          order_id: orderId,
          user_id: userId,
          discount_applied: discountApplied,
          created_at: new Date().toISOString(),
        },
      ]);

    if (insertError) {
      throw new Error(`Error recording coupon usage: ${insertError.message}`);
    }

    console.log('[Coupon] Usage recorded successfully:', { couponId, orderId, userId, discountApplied });
    return { success: true };
  } catch (err: any) {
    console.error('[Coupon] Error registering coupon usage:', err.message);
    throw err; // Re-throw to let caller handle it
  }
}
