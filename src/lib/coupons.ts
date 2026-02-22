import { supabase } from './supabase';

const DEBUG = import.meta.env.DEV;

export interface CartItemForCoupon {
  product: {
    id: string;
    category_id: string;
    price: number;
  };
  quantity: number;
}

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
 * Validates a coupon code with comprehensive checks including category restrictions
 * @param code - The coupon code to validate
 * @param totalAmount - The total amount in cents
 * @param userId - Optional user ID to check if user already used this coupon
 * @param cartItems - Optional cart items to validate category restrictions
 * @returns Validation result with coupon details or error message
 */
export async function validateCoupon(
  code: string,
  totalAmount: number,
  userId?: string | null,
  cartItems?: CartItemForCoupon[]
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

    // Cast to any to avoid type issues with Supabase types
    const validCoupon = coupon as any;

    // Check if coupon is active
    if (!validCoupon.is_active) {
      return {
        valid: false,
        error: 'Este cupón no está disponible actualmente',
      };
    }

    // Check start date (valid_from)
    const now = new Date();
    if (validCoupon.valid_from && new Date(validCoupon.valid_from) > now) {
      const startDate = new Date(validCoupon.valid_from).toLocaleDateString('es-ES');
      return {
        valid: false,
        error: `Este cupón será válido a partir del ${startDate}`,
      };
    }

    // Check expiration date (valid_until)
    if (validCoupon.valid_until && new Date(validCoupon.valid_until) < now) {
      const expiredDate = new Date(validCoupon.valid_until).toLocaleDateString('es-ES');
      return {
        valid: false,
        error: `Este cupón expiró el ${expiredDate}`,
      };
    }

    // Check max uses limit (global)
    if (validCoupon.max_uses && validCoupon.current_uses >= validCoupon.max_uses) {
      return {
        valid: false,
        error: `Este cupón ha alcanzado el máximo de usos (${validCoupon.max_uses})`,
      };
    }

    // Check minimum purchase amount
    if (validCoupon.min_purchase_amount && totalAmount < validCoupon.min_purchase_amount) {
      const minAmount = (validCoupon.min_purchase_amount / 100).toFixed(2);
      const currentAmount = (totalAmount / 100).toFixed(2);
      return {
        valid: false,
        error: `Compra mínima de €${minAmount} requerida. Tu carrito tiene €${currentAmount}`,
      };
    }

    // Check if user has already used this coupon (if userId provided)
    // Restrict to one use per user
    if (userId) {
      const { data: userUsage, error: usageError } = await supabase
        .from('coupon_usage')
        .select('id')
        .eq('coupon_id', validCoupon.id)
        .eq('user_id', userId)
        .single();

      // If no error and data exists, user has already used this coupon
      if (!usageError && userUsage) {
        return {
          valid: false,
          error: 'Ya has utilizado este código de descuento. Solo puedes usarlo una vez.',
        };
      }
    }

    // NEW: Validate category restrictions
    if (validCoupon.applicable_categories && validCoupon.applicable_categories.length > 0 && cartItems) {
      // Filter items that match applicable categories
      const validItems = cartItems.filter(item => 
        validCoupon.applicable_categories!.includes(item.product.category_id)
      );

      if (validItems.length === 0) {
        return {
          valid: false,
          error: 'Este cupón no es aplicable a los productos en tu carrito',
        };
      }

      // Recalculate total based only on applicable items
      const applicableTotal = validItems.reduce(
        (sum, item) => sum + (item.product.price * item.quantity),
        0
      );

      // Use the applicable total for min purchase validation
      if (validCoupon.min_purchase_amount && applicableTotal < validCoupon.min_purchase_amount) {
        const minAmount = (validCoupon.min_purchase_amount / 100).toFixed(2);
        const currentAmount = (applicableTotal / 100).toFixed(2);
        return {
          valid: false,
          error: `Compra mínima de €${minAmount} requerida en productos aplicables. Tienes €${currentAmount}`,
        };
      }

      // Update totalAmount to applicable total for discount calculation
      totalAmount = applicableTotal;

      if (DEBUG) {
        console.log('[Coupon] Category restriction applied:', {
          applicable_categories: validCoupon.applicable_categories,
          valid_items: validItems.length,
          total_items: cartItems.length,
          applicable_total: applicableTotal
        });
      }
    }

    return {
      valid: true,
      coupon: {
        id: validCoupon.id,
        code: validCoupon.code,
        discount_type: validCoupon.discount_type,
        discount_value: validCoupon.discount_value,
        max_discount_amount: validCoupon.max_discount_amount,
        min_purchase_amount: validCoupon.min_purchase_amount,
      },
    };
  } catch (err: any) {
    if (DEBUG) {
      console.error('[Coupon] Validation error:', err);
    }
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
    // Use atomic RPC function to prevent race conditions
    const { data, error } = await (supabase as any).rpc('increment_coupon_usage_atomic', {
      p_coupon_id: couponId,
      p_order_id: orderId,
      p_user_id: userId,
      p_discount_applied: discountApplied,
    });

    if (error) {
      throw new Error(`Error incrementing coupon usage: ${error.message}`);
    }

    // Cast to any to avoid type issues
    const result = data as any;

    if (!result || !result.success) {
      const errorMsg = result?.error || 'Unknown error incrementing coupon usage';
      if (DEBUG) {
        console.warn('[Coupon] Usage increment rejected:', { couponId, error: errorMsg });
      }
      throw new Error(errorMsg);
    }

    if (DEBUG) {
      console.log('[Coupon] Usage recorded successfully (atomic):', { 
        couponId, 
        orderId, 
        discountApplied,
        newUses: result.new_uses 
      });
    }
    return { success: true, newUses: result.new_uses };
  } catch (err: any) {
    console.error('[Coupon] Error registering coupon usage:', err.message);
    throw err; // Re-throw to let caller handle it
  }
}
