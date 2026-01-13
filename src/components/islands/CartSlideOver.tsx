import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { cartItemsArray, cartTotal, removeFromCart, updateQuantity, clearCart } from '@/stores/cart';
import { formatPrice } from '@/lib/utils';

export default function CartSlideOver() {
    const [isOpen, setIsOpen] = useState(false);
    const items = useStore(cartItemsArray);
    const total = useStore(cartTotal);

    useEffect(() => {
        const handleToggle = () => setIsOpen(!isOpen);
        window.addEventListener('toggle-cart', handleToggle);
        return () => window.removeEventListener('toggle-cart', handleToggle);
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-noir-900/50 backdrop-blur-sm z-40 animate-fade-in"
                onClick={() => setIsOpen(false)}
            />

            {/* Slide Over Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-soft-lg z-50 flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-noir-200">
                    <h2 className="text-xl font-serif text-noir-900">Carrito de Compra</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-noir-600 hover:text-noir-900 transition-colors"
                        aria-label="Cerrar carrito"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <svg className="w-24 h-24 text-noir-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <p className="text-noir-600 text-lg">Tu carrito está vacío</p>
                            <p className="text-noir-500 text-sm mt-2">Añade productos para comenzar tu compra</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div key={item.product.id} className="flex space-x-4 pb-4 border-b border-noir-200">
                                    {/* Product Image */}
                                    <div className="w-20 h-20 flex-shrink-0 bg-cream-100 rounded-lg overflow-hidden">
                                        <img
                                            src={item.product.images[0] || '/placeholder-product.jpg'}
                                            alt={item.product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-noir-900 truncate">
                                            {item.product.name}
                                        </h3>
                                        <p className="text-sm text-noir-600 mt-1">
                                            {formatPrice(item.product.price)}
                                        </p>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center space-x-2 mt-2">
                                            <button
                                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                className="w-6 h-6 flex items-center justify-center border border-noir-300 rounded text-noir-700 hover:bg-cream-100 transition-colors"
                                            >
                                                −
                                            </button>
                                            <span className="text-sm font-medium text-noir-900 w-8 text-center">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    try {
                                                        updateQuantity(item.product.id, item.quantity + 1);
                                                    } catch (err) {
                                                        alert(err instanceof Error ? err.message : 'Error');
                                                    }
                                                }}
                                                className="w-6 h-6 flex items-center justify-center border border-noir-300 rounded text-noir-700 hover:bg-cream-100 transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => removeFromCart(item.product.id)}
                                        className="text-noir-500 hover:text-rose-600 transition-colors"
                                        aria-label="Eliminar producto"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-noir-200 px-6 py-4 space-y-4">
                        {/* Total */}
                        <div className="flex items-center justify-between text-lg font-semibold">
                            <span className="text-noir-900">Total</span>
                            <span className="text-noir-900">{formatPrice(total)}</span>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            <a
                                href="/carrito"
                                className="block w-full px-6 py-3 bg-noir-900 text-cream-50 text-center rounded-lg font-medium hover:bg-noir-800 transition-colors"
                            >
                                Ver Carrito Completo
                            </a>
                            <button
                                onClick={() => {
                                    if (confirm('¿Estás seguro de vaciar el carrito?')) {
                                        clearCart();
                                    }
                                }}
                                className="block w-full px-6 py-3 text-noir-700 text-center rounded-lg font-medium hover:bg-cream-100 transition-colors"
                            >
                                Vaciar Carrito
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
