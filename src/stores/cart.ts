import { atom, map, computed } from 'nanostores';
import { persistentMap } from '@nanostores/persistent';
import type { Product } from '@/lib/supabase';

// Cart Item Interface
export interface CartItem {
    product: Product;
    quantity: number;
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
}

/**
 * Remove product from cart
 */
export function removeFromCart(productId: string) {
    const currentItems = cartItems.get();
    const { [productId]: removed, ...rest } = currentItems;
    cartItems.set(rest);
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
}

/**
 * Clear entire cart
 */
export function clearCart() {
    cartItems.set({});
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
