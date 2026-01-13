import { clsx, type ClassValue } from 'clsx';

/**
 * Utility for merging class names
 */
export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

/**
 * Format price from cents to currency string
 */
export function formatPrice(cents: number, locale: string = 'es-ES'): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
    }).format(cents / 100);
}

/**
 * Generate URL-friendly slug from string
 */
export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

/**
 * Get Supabase storage URL for product image
 */
export function getImageUrl(imagePath: string): string {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/products-images/${imagePath}`;
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.slice(0, length).trim() + '...';
}

/**
 * Check if stock is available
 */
export function isInStock(stock: number): boolean {
    return stock > 0;
}

/**
 * Get stock status label
 */
export function getStockLabel(stock: number): string {
    if (stock === 0) return 'Agotado';
    if (stock <= 5) return `Solo ${stock} disponibles`;
    return 'En stock';
}
