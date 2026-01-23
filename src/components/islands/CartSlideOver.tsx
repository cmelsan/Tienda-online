import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { cartItemsArray, cartTotal, cartSubtotal, appliedCoupon, removeFromCart, updateQuantity, clearCart } from '@/stores/cart';
import { formatPrice } from '@/lib/utils';

export default function CartSlideOver() {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const items = useStore(cartItemsArray);
    const subtotal = useStore(cartSubtotal);
    const total = useStore(cartTotal);
    const coupon = useStore(appliedCoupon);

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

    const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
                onClick={() => setIsOpen(false)}
            />

            {/* Slide Over Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
                {/* Header - Premium Design */}
                <div className="border-b border-gray-100 px-6 py-5 bg-gradient-to-r from-gray-50 to-white sticky top-0">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <h2 className="text-2xl font-bold text-black">Carrito</h2>
                            <p className="text-xs text-gray-500 mt-1">{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                            aria-label="Cerrar carrito"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <p className="text-gray-700 text-lg font-semibold">Tu carrito está vacío</p>
                            <p className="text-gray-500 text-sm mt-2">Explora nuestros productos y añade tus favoritos</p>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="mt-6 px-6 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                            >
                                Seguir Comprando
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div
                                    key={item.product.id}
                                    onMouseEnter={() => setHoveredItem(item.product.id)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                    className="group flex space-x-4 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200"
                                >
                                    {/* Product Image */}
                                    <div className="relative w-20 h-20 flex-shrink-0">
                                        <img
                                            src={item.product.images[0] || '/placeholder-product.jpg'}
                                            alt={item.product.name}
                                            className="w-full h-full object-cover rounded-lg border border-gray-100"
                                        />
                                        {hoveredItem === item.product.id && (
                                            <div className="absolute inset-0 bg-black/10 rounded-lg transition-all duration-200" />
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-900 truncate line-clamp-2">
                                                {item.product.name}
                                            </h3>
                                            <p className="text-sm font-bold text-black mt-1">
                                                {formatPrice(item.product.price)}
                                            </p>
                                        </div>

                                        {/* Quantity Controls - Enhanced */}
                                        <div className="flex items-center space-x-2 mt-2 bg-gray-100 rounded-lg w-fit p-1">
                                            <button
                                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition-colors text-gray-700 font-semibold"
                                                title="Disminuir cantidad"
                                            >
                                                −
                                            </button>
                                            <span className="text-sm font-semibold text-gray-900 w-6 text-center">
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
                                                className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition-colors text-gray-700 font-semibold"
                                                title="Aumentar cantidad"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => removeFromCart(item.product.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 duration-200"
                                        aria-label="Eliminar producto"
                                        title="Eliminar"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer - Premium Checkout Section */}
                {items.length > 0 && (
                    <div className="border-t border-gray-100 px-6 py-5 bg-gradient-to-t from-white to-gray-50 space-y-4">
                        {/* Coupon Badge */}
                        {coupon && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                                        </svg>
                                        <span className="text-sm font-semibold text-green-900">{coupon.code}</span>
                                    </div>
                                    <span className="text-sm font-bold text-green-600">-{formatPrice(coupon.discount_amount)}</span>
                                </div>
                            </div>
                        )}

                        {/* Price Breakdown */}
                        <div className="space-y-2 py-3 border-t border-b border-gray-100">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                            </div>
                            {coupon && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Descuento</span>
                                    <span className="font-semibold">-{formatPrice(coupon.discount_amount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold text-black pt-2">
                                <span>Total</span>
                                <span className="text-xl">{formatPrice(total)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            <a
                                href="/checkout"
                                className="block w-full px-4 py-3 bg-black text-white text-center rounded-lg font-semibold hover:bg-gray-900 transition-all duration-200 transform hover:scale-105 active:scale-95"
                            >
                                Finalizar Compra
                            </a>
                            <a
                                href="/carrito"
                                className="block w-full px-4 py-2 border-2 border-gray-300 text-gray-900 text-center rounded-lg font-medium hover:border-gray-400 hover:bg-gray-50 transition-colors"
                            >
                                Ver Carrito Completo
                            </a>
                            <button
                                onClick={() => {
                                    if (confirm('¿Estás seguro de vaciar el carrito?')) {
                                        clearCart();
                                    }
                                }}
                                className="block w-full px-4 py-2 text-gray-600 text-center text-sm hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                            >
                                Vaciar Carrito
                            </button>
                        </div>

                        {/* Trust Indicators */}
                        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 pt-2">
                            <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 11-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM14 2a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V6h-1a1 1 0 110-2h1V3a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                <span>Entrega Rápida</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 11-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM14 2a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V6h-1a1 1 0 110-2h1V3a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                <span>Pago Seguro</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
