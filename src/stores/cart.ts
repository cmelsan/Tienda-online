import { atom, map, computed } from 'nanostores';
import { persistentMap } from '@nanostores/persistent';
import type { Product } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { getOrCreateSessionId } from '@/lib/sessionManager';

// Cart Item Interface
export interface CartItem {
    product: Product;
    quantity: number;
}

// Helper to sync with backend (optimistic, no-blocking)
async function syncToBackend(items: Record<string, CartItem>) {
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
            if (error) console.error('Error updating cart:', error);
        } else {
            const { error } = await supabase.from('carts').insert({
                user_id: userId || null,
                session_id: userId ? null : sessionId,
                items: itemsArray
            });
            if (error) console.error('Error creating cart:', error);
        }
    } catch (err) {
        console.error('Cart sync failed:', err);
    }
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

// Computed: Total items in cart
export const cartCount = computed(cartItems, (items) => {
    return Object.values(items).reduce((total, item) => total + item.quantity, 0);
});

// Computed: Total price in cents
export const cartTotal = computed(cartItems, (items) => {
    return Object.values(items).reduce(
        (total, item) => total + item.product.price * item.quantity,
        0
    );
});

// Computed: Cart items as array
export const cartItemsArray = computed(cartItems, (items) => {
    return Object.values(items);
});

/**
 * Add product to cart
 */
export function addToCart(product: Product, quantity: number = 1) {
    const currentItems = cartItems.get();
    const existingItem = currentItems[product.id];

    if (existingItem) {
        // Update quantity if product already in cart
        const newQuantity = existingItem.quantity + quantity;

        // Check stock availability
        if (newQuantity > product.stock) {
            throw new Error(`Solo hay ${product.stock} unidades disponibles`);
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
 * Clear entire cart
 */
export function clearCart() {
    cartItems.set({});
    // Sync to backend (clear)
    syncToBackend({});
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
