import { supabase } from './supabase';

export interface CouponValidationResult {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  };
  error?: string;
}

export async function validateCoupon(
  code: string,
  totalAmount: number
): Promise<CouponValidationResult> {
  try {
    // Buscar el cupón
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !coupon) {
      return {
        valid: false,
        error: 'Código de descuento no válido',
      };
    }

    // Verificar si está activo
    if (!coupon.is_active) {
      return {
        valid: false,
        error: 'Este cupón no está disponible',
      };
    }

    // Verificar fecha de validez
    const now = new Date();
    if (new Date(coupon.valid_from) > now) {
      return {
        valid: false,
        error: 'Este cupón aún no es válido',
      };
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return {
        valid: false,
        error: 'Este cupón ha expirado',
      };
    }

    // Verificar límite de usos
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return {
        valid: false,
        error: 'Este cupón ha alcanzado el límite de usos',
      };
    }

    // Verificar monto mínimo
    if (totalAmount < coupon.min_purchase_amount) {
      return {
        valid: false,
        error: `Compra mínima de €${(coupon.min_purchase_amount / 100).toFixed(2)} requerida`,
      };
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
      },
    };
  } catch (err) {
    return {
      valid: false,
      error: 'Error al validar el cupón',
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
    // Incrementar el contador de usos
    const { data: coupon } = await supabase
      .from('coupons')
      .select('current_uses')
      .eq('id', couponId)
      .single();

    if (coupon) {
      await supabase
        .from('coupons')
        .update({ current_uses: coupon.current_uses + 1 })
        .eq('id', couponId);
    }

    // Registrar el uso
    await supabase
      .from('coupon_usage')
      .insert([
        {
          coupon_id: couponId,
          order_id: orderId,
          user_id: userId,
          discount_applied: discountApplied,
        },
      ]);
  } catch (err) {
    console.error('Error al registrar uso de cupón:', err);
  }
}
