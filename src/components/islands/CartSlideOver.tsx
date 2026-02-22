import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { cartItemsArray, cartTotal, cartSubtotal, appliedCoupon, removeFromCart, updateQuantity, clearCart, isCartOpen } from '@/stores/cart';
import { addNotification } from '@/stores/notifications';
import { formatPrice } from '@/lib/utils';

export default function CartSlideOver() {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const items = useStore(cartItemsArray);
    const subtotal = useStore(cartSubtotal);
    const total = useStore(cartTotal);
    const coupon = useStore(appliedCoupon);
    const cartOpenState = useStore(isCartOpen);

    // Sync with store state
    useEffect(() => {
        console.log('[CartSlideOver] Store state changed:', cartOpenState);
        setIsOpen(cartOpenState);
    }, [cartOpenState]);

    // Handle toggle-cart event - no dependency on isOpen to avoid circular updates
    useEffect(() => {
        const handleToggle = () => {
            console.log('[CartSlideOver] Toggle event received');
            setIsOpen((prev) => {
                const newState = !prev;
                isCartOpen.set(newState);
                return newState;
            });
        };
        window.addEventListener('toggle-cart', handleToggle);
        return () => window.removeEventListener('toggle-cart', handleToggle);
    }, []); // Empty dependency array - only set up listener once

    // Close on escape key and sync with store
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                isCartOpen.set(false);
            }
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

    return (
        <>
            {/* Backdrop - always rendered but hidden when closed */}
            <div
                className={`fixed inset-0 backdrop-blur-sm z-40 animate-fade-in transition-opacity duration-300 ${
                    isOpen ? 'bg-black/40 opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => {
                    setIsOpen(false);
                    isCartOpen.set(false);
                }}
            />

            {/* Slide Over Panel - always rendered but positioned off-screen when closed */}
            <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
                isOpen ? 'translate-x-0 animate-slide-in-right' : 'translate-x-full'
            }`}>
                {/* Header - Limpio y Simple */}
                <div className="border-b border-gray-200 px-6 py-5 bg-white sticky top-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-black">Carrito</h2>
                            <p className="text-sm text-gray-500 mt-0.5">{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                isCartOpen.set(false);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
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
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <p className="text-gray-900 text-lg font-semibold mb-2">Tu carrito está vacío</p>
                            <p className="text-gray-500 text-sm mb-6">Explora nuestros productos y añade tus favoritos</p>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    isCartOpen.set(false);
                                }}
                                className="px-8 py-3 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
                            >
                                Seguir Comprando
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div
                                    key={item.product.id}
                                    className="flex gap-4 pb-4 border-b border-gray-100 last:border-0"
                                >
                                    {/* Product Image */}
                                    <div className="w-20 h-20 flex-shrink-0 relative">
                                        <img
                                            src={item.product?.images?.[0] || '/placeholder-product.jpg'}
                                            alt={item.product?.name || 'Producto'}
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        {/* Discount Badge */}
                                        {(item.product?.discount > 0 || (item.product?.is_flash_sale && item.product?.flash_sale_discount > 0)) && (
                                            <div className="absolute -top-2 -left-2 w-10 h-10 flex items-center justify-center rounded-full bg-beauty-red text-white font-bold text-xs shadow-md">
                                                -{item.product?.discount || item.product?.flash_sale_discount}%
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between gap-2 mb-2">
                                            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
                                                {item.product?.name || 'Producto'}
                                            </h3>
                                            <button
                                                onClick={() => removeFromCart(item.product?.id)}
                                                className="text-gray-400 hover:text-beauty-red transition-colors flex-shrink-0"
                                                aria-label="Eliminar producto"
                                                title="Eliminar"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>

                                        <p className="text-base font-bold text-black mb-3">
                                            {(() => {
                                                const discountPercent = item.product?.discount || item.product?.flash_sale_discount || 0;
                                                const currentPrice = item.product?.price || 0;
                                                const displayPrice = item.product?.discountedPrice || currentPrice;

                                                // Calculate original price with all fallbacks:
                                                // 1. Use explicitly stored originalPrice
                                                // 2. Calculate from discount % (handles old cart data)
                                                // 3. Use price as-is if no discount
                                                let originalPrice = item.product?.originalPrice || 0;
                                                if (!originalPrice && discountPercent > 0 && displayPrice > 0) {
                                                    originalPrice = Math.round(displayPrice / (1 - discountPercent / 100));
                                                } else if (!originalPrice) {
                                                    originalPrice = currentPrice;
                                                }

                                                const hasDiscount = discountPercent > 0 && originalPrice > displayPrice;

                                                if (hasDiscount) {
                                                    return (
                                                        <div className="flex gap-2 items-center">
                                                            <span className="line-through text-gray-400 text-sm">
                                                                {formatPrice(originalPrice)}
                                                            </span>
                                                            <span className="text-beauty-red font-bold">
                                                                {formatPrice(displayPrice)}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return formatPrice(displayPrice);
                                            })()}
                                        </p>

                                        {/* Quantity Controls - Mejorados */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-xs text-gray-500 font-medium">Cantidad:</span>
                                            <div className="flex items-center border border-gray-300 rounded-lg">
                                                <button
                                                    onClick={() => updateQuantity(item.product?.id, item.quantity - 1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-700 font-semibold border-r border-gray-300"
                                                    title="Disminuir cantidad"
                                                >
                                                    −
                                                </button>
                                                <span className="text-sm font-semibold text-gray-900 w-10 text-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        try {
                                                            updateQuantity(item.product?.id, item.quantity + 1);
                                                        } catch (err) {
                                                            addNotification(err instanceof Error ? err.message : 'Error', 'error');
                                                        }
                                                    }}
                                                    disabled={item.quantity >= (item.product?.stock ?? 0)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-700 font-semibold border-l border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    title="Aumentar cantidad"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            {item.quantity >= (item.product?.stock ?? 0) && (
                                                <span className="text-xs text-amber-600 font-medium">Máximo disponible</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer - Optimizado para Conversión */}
                {items.length > 0 && (
                    <div className="border-t border-gray-200 px-6 py-5 bg-white space-y-4">
                        {/* Coupon Badge */}
                        {coupon && coupon.discount_amount > 0 && (
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                                    </svg>
                                    <span className="text-sm font-semibold text-green-900">{coupon.code}</span>
                                </div>
                                <span className="text-sm font-bold text-green-600">-{formatPrice(coupon.discount_amount)}</span>
                            </div>
                        )}

                        {/* Price Breakdown - Simplificado */}
                        <div className="space-y-2.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                            </div>
                            {coupon && coupon.discount_amount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-600">Descuento</span>
                                    <span className="font-semibold text-green-600">-{formatPrice(coupon.discount_amount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-baseline pt-2 border-t border-gray-200">
                                <span className="text-lg font-bold text-black">Total</span>
                                <span className="text-2xl font-bold text-black">{formatPrice(total)}</span>
                            </div>
                        </div>

                        {/* Actions - Jerarquía Clara */}
                        <div className="space-y-2.5 pt-2">
                            <a
                                href="/checkout"
                                className="block w-full px-6 py-3.5 bg-black text-white text-center rounded-lg font-semibold hover:bg-gray-900 transition-all shadow-sm"
                            >
                                Finalizar Compra
                            </a>
                            <a
                                href="/carrito"
                                className="block w-full px-6 py-2.5 border border-gray-300 text-gray-700 text-center rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Ver Carrito Completo
                            </a>
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="block w-full px-6 py-2 text-gray-500 text-center text-sm hover:text-red-600 transition-colors font-medium"
                            >
                                Vaciar Carrito
                            </button>

                            {/* Custom Clear Cart Confirmation Modal */}
                            {showClearConfirm && (
                                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)} />
                                    <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
                                        <div className="flex flex-col items-center text-center gap-4">
                                            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                                                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-black mb-1">¿Vaciar carrito?</h3>
                                                <p className="text-sm text-gray-500">Se eliminarán todos los productos de tu carrito. Esta acción no se puede deshacer.</p>
                                            </div>
                                            <div className="flex gap-3 w-full pt-2">
                                                <button
                                                    onClick={() => setShowClearConfirm(false)}
                                                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => { clearCart(); setShowClearConfirm(false); }}
                                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-colors"
                                                >
                                                    Sí, vaciar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Trust Indicators - Simplificados */}
                        <div className="flex items-center justify-center gap-6 text-xs text-gray-500 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                                </svg>
                                <span>Envío Rápido</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
