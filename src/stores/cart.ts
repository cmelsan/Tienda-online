import { atom, map, computed } from 'nanostores';
import { persistentMap, persistentAtom } from '@nanostores/persistent';
import type { Product } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { getOrCreateSessionId } from '@/lib/sessionManager';
import { addNotification } from '@/stores/notifications';

const DEBUG = import.meta.env.DEV;
const MAX_QUANTITY_PER_ITEM = 9999; // Maximum quantity allowed per product

// Cart Item Interface
export interface CartItem {
    product: Product & {
        originalPrice?: number;  // Explicitly stored original price before discount
        discount?: number;
        discountedPrice?: number;
        is_flash_sale?: boolean;
        flash_sale_discount?: number;
    };
    quantity: number;
}

// Helper to sync with backend (optimistic, with retry logic)
async function syncToBackend(items: Record<string, CartItem>, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const sessionId = getOrCreateSessionId();
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;

            const itemsArray = Object.values(items);

            // Find existing cart
            let query = supabase.from('carts').select('id');
            if (userId) {
                query = query.eq('user_id', userId);
            } else {
                query = query.eq('session_id', sessionId);
            }

            const { data: carts, error: fetchError } = await query;
            if (fetchError) throw fetchError;

            const existingCart = carts && carts[0];

            if (existingCart) {
                const { error } = await supabase.from('carts').update({
                    items: itemsArray,
                    updated_at: new Date().toISOString()
                }).eq('id', existingCart.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('carts').insert({
                    user_id: userId || null,
                    session_id: userId ? null : sessionId,
                    items: itemsArray
                });
                if (error) throw error;
            }

            // Success - exit retry loop
            if (DEBUG && attempt > 0) {
                console.log(`[Cart] Sync succeeded on attempt ${attempt + 1}`);
            }
            return { success: true };
        } catch (err) {
            if (DEBUG) {
                console.error(`[Cart] Sync attempt ${attempt + 1}/${retries} failed:`, err);
            }
            
            // Last attempt failed
            if (attempt === retries - 1) {
                console.error('[Cart] All sync attempts failed:', err);
                
                // Notify user (only on final failure)
                if (typeof window !== 'undefined') {
                    addNotification(
                        'No se pudo sincronizar tu carrito con el servidor. Los cambios están guardados localmente.',
                        'warning',
                        5000
                    );
                }
            } else {
                // Exponential backoff before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    }
    return { success: false };
}

// Persistent cart store (saved to localStorage)
export const cartItems = persistentMap<Record<string, CartItem>>(
    'eclat-cart:',
    {},
    {
        encode: JSON.stringify,
        decode: JSON.parse,
    }
);

// Cart UI state
export const isCartOpen = atom<boolean>(false);

// Coupon state - Persistente en localStorage (se limpia al completar el pago)
export const appliedCoupon = persistentAtom<{
    code: string;
    id: string;
    discount_value: number;
    discount_type: 'percentage' | 'fixed';
    discount_amount: number;
} | null>('eclat-coupon:', null, {
    encode: JSON.stringify,
    decode: (raw) => {
        try { return JSON.parse(raw); } catch { return null; }
    }
});

// Computed: Total items in cart
export const cartCount = computed(cartItems, (items) => {
    return Object.values(items).reduce((total, item) => total + item.quantity, 0);
});

// Computed: Total price in cents (before coupon discount)
export const cartSubtotal = computed(cartItems, (items) => {
    return Object.values(items).reduce(
        (total, item) => {
            let price = item.product.discountedPrice || item.product.price || 0;
            
            // Use discountedPrice if available (it's the final price with discount applied)
            // Otherwise fallback to price
            
            return total + price * item.quantity;
        },
        0
    );
});

// Computed: Total price with discount applied
export const cartTotal = computed(
    [cartSubtotal, appliedCoupon],
    (subtotal, coupon) => {
        if (!coupon || !coupon.code) return subtotal;
        const discountAmount = coupon.discount_amount || 0;
        return Math.max(0, subtotal - discountAmount);
    }
);

// Computed: Cart items as array
export const cartItemsArray = computed(cartItems, (items) => {
    return Object.values(items);
});

/**
 * Add product to cart
 * Price should be stored in cents (e.g., 4200 = 42.00€)
 */
export function addToCart(product: Product, quantity: number = 1) {
    // Validate inputs
    if (!product || !product.id) {
        throw new Error('Producto inválido');
    }

    // Validate quantity range and type
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
        throw new Error(`Cantidad inválida. Debe ser un número entero entre 1 y ${MAX_QUANTITY_PER_ITEM}`);
    }

    // Ensure price is a valid number in cents
    const price = product.price;
    if (typeof price !== 'number' || price < 0) {
        console.error('[addToCart] Invalid price:', { productId: product.id, price });
        throw new Error('Precio del producto inválido');
    }

    const currentItems = cartItems.get();
    const existingItem = currentItems[product.id];

    if (existingItem) {
        // Update quantity if product already in cart
        const newQuantity = existingItem.quantity + quantity;

        // Check stock availability
        if (newQuantity > product.stock) {
            throw new Error(`Solo hay ${product.stock} unidades disponibles`);
        }

        // Check maximum quantity limit
        if (newQuantity > MAX_QUANTITY_PER_ITEM) {
            throw new Error(`No puedes agregar más de ${MAX_QUANTITY_PER_ITEM} unidades de un producto`);
        }

        cartItems.setKey(product.id, {
            product,
            quantity: newQuantity,
        });
    } else {
        // Add new product to cart
        if (quantity > product.stock) {
            throw new Error(`Solo hay ${product.stock} unidades disponibles`);
        }

        cartItems.setKey(product.id, {
            product,
            quantity,
        });
    }

    // Log for debugging (only in dev)
    if (DEBUG) {
        console.log('[addToCart] Item added:', { productId: product.id, quantity, price });
    }

    // Sync to backend
    syncToBackend(cartItems.get());
}

/**
 * Remove product from cart
 */
export function removeFromCart(productId: string) {
    const currentItems = cartItems.get();
    const { [productId]: removed, ...rest } = currentItems;
    cartItems.set(rest);

    // Sync to backend
    syncToBackend(rest);
}

/**
 * Update product quantity in cart
 */
export function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    // Validate quantity range and type
    if (!Number.isInteger(quantity) || quantity > MAX_QUANTITY_PER_ITEM) {
        throw new Error(`Cantidad inválida. Debe ser un número entero entre 1 y ${MAX_QUANTITY_PER_ITEM}`);
    }

    const currentItems = cartItems.get();
    const item = currentItems[productId];

    if (!item) return;

    // Check stock availability
    if (quantity > item.product.stock) {
        throw new Error(`Solo hay ${item.product.stock} unidades disponibles`);
    }

    cartItems.setKey(productId, {
        ...item,
        quantity,
    });

    // Sync to backend
    syncToBackend(cartItems.get());
}

/**
 * Clear entire cart and coupon
 * El cupón NO se registra aquí - se registra después del pago exitoso en /api/orders/create
 */
export function clearCart() {
    // Limpiar Nano Store
    cartItems.set({});
    appliedCoupon.set(null);
    
    // Limpiar localStorage del carrito
    localStorage.removeItem('eclat-cart:');
    // Nota: 'eclat-coupon:' ya NO se usa (appliedCoupon no es persistent)
    
    // Sync to backend (clear)
    syncToBackend({});
    
    console.log('[Cart] Carrito vaciado completamente. Cupón se limpió de memoria.');
}

/**
 * Clear only the applied coupon (también borra de localStorage)
 */
export function removeCoupon() {
    appliedCoupon.set(null);
    console.log('[Coupon] Cupón removido');
}

/**
 * Apply a coupon code
 */
export function applyCoupon(coupon: {
    code: string;
    id: string;
    discount_value: number;
    discount_type: 'percentage' | 'fixed';
    discount_amount: number;
}) {
    appliedCoupon.set(coupon);
}

/**
 * Check if product is in cart
 */
export function isInCart(productId: string): boolean {
    const currentItems = cartItems.get();
    return productId in currentItems;
}

/**
 * Get quantity of specific product in cart
 */
export function getCartItemQuantity(productId: string): number {
    const currentItems = cartItems.get();
    return currentItems[productId]?.quantity || 0;
}
