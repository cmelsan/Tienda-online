import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { addToCart } from '@/stores/cart';
import type { Product } from '@/lib/supabase';

interface AddToCartButtonProps {
    product: Product & {
        discount?: number;
        discountedPrice?: number;
    };
}

export default function AddToCartButton({ product }: AddToCartButtonProps) {
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleAddToCart = async () => {
        // Validate product
        if (!product || !product.id) {
            setError('Producto inválido');
            console.error('[AddToCart] Invalid product:', product);
            return;
        }

        if (product.stock === 0) {
            setError('Producto agotado');
            return;
        }

        if (quantity < 1 || isNaN(quantity)) {
            setError('Cantidad inválida');
            return;
        }

        setIsAdding(true);
        setError('');

        try {
            console.log('[AddToCart] Adding product:', {
                id: product.id,
                name: product.name,
                price: product.price,
                discount: product.discount || 0,
                discountedPrice: product.discountedPrice || product.price,
                quantity
            });

            addToCart(product, quantity);

            // Show success feedback
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);

            // Reset quantity
            setQuantity(1);

            // Open cart to show item was added
            window.dispatchEvent(new CustomEvent('toggle-cart'));

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error al añadir al carrito';
            setError(errorMsg);
            console.error('[AddToCart] Error:', errorMsg, err);
        } finally {
            setIsAdding(false);
        }
    };

    const isOutOfStock = product.stock === 0;
    const maxQuantity = Math.min(product.stock || 0, 10);

    return (
        <div className="space-y-4">
            {/* Quantity Selector */}
            <div className="flex items-center space-x-4">
                <label htmlFor="quantity" className="text-sm font-medium text-noir-900">
                    Cantidad:
                </label>
                <div className="flex items-center border border-noir-300 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1 || isOutOfStock}
                        className="px-3 py-2 text-noir-700 hover:bg-cream-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        −
                    </button>
                    <input
                        type="number"
                        id="quantity"
                        value={quantity}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val >= 1 && val <= maxQuantity) {
                                setQuantity(val);
                            }
                        }}
                        min="1"
                        max={maxQuantity}
                        disabled={isOutOfStock}
                        className="w-16 text-center border-x border-noir-300 py-2 focus:outline-none disabled:opacity-50"
                    />
                    <button
                        type="button"
                        onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                        disabled={quantity >= maxQuantity || isOutOfStock}
                        className="px-3 py-2 text-noir-700 hover:bg-cream-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        +
                    </button>
                </div>
                {product.stock <= 5 && product.stock > 0 && (
                    <span className="text-sm text-pink-500">
                        Solo {product.stock} disponibles
                    </span>
                )}
            </div>

            {/* Add to Cart Button */}
            <button
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAdding}
                className={`w-full px-8 py-4 rounded-lg font-medium text-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isOutOfStock
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : showSuccess
                            ? 'bg-green-600 text-white'
                            : 'bg-black text-white hover:bg-gray-900 focus:ring-black'
                    }`}
            >
                {isAdding ? (
                    <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Añadiendo...
                    </span>
                ) : showSuccess ? (
                    <span className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        ¡Añadido!
                    </span>
                ) : isOutOfStock ? (
                    'Agotado'
                ) : (
                    'Añadir al Carrito'
                )}
            </button>

            {/* Error Message */}
            {error && (
                <p className="text-sm text-pink-500 text-center">{error}</p>
            )}
        </div>
    );
}
