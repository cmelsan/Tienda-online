import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { cartItemsArray, cartTotal, clearCart, appliedCoupon } from '@/stores/cart';
import { supabase } from '@/lib/supabase';
import { addNotification } from '@/stores/notifications';

export default function CheckoutButton() {
    const items = useStore(cartItemsArray);
    const total = useStore(cartTotal);
    const coupon = useStore(appliedCoupon);
    const [isLoading, setIsLoading] = useState(false);

    // UI State
    const [showGuestEmailInput, setShowGuestEmailInput] = useState(false);
    const [guestEmail, setGuestEmail] = useState('');
    const [user, setUser] = useState<any>(null);

    // Initial Auth Check & Listener
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for changes (sign in, sign out, generic refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleInitialClick = () => {
        if (!user) {
            // If not logged in, show email input
            setShowGuestEmailInput(true);
        } else {
            // If logged in, proceed directly
            handleCheckout(null);
        }
    };

    const handleCheckout = async (emailOverride: string | null) => {
        setIsLoading(true);

        try {
            if (items.length === 0) {
                addNotification('El carrito está vacío', 'warning');
                setIsLoading(false);
                return;
            }

            const finalGuestEmail = emailOverride || null;

            // Prepare Payload
            const orderItems = items.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                price: item.product.price
            }));

            // 2. Create Order in Pending State
            const emailToUse = finalGuestEmail || user?.email;

            const { data, error } = await supabase.rpc('create_order', {
                p_items: orderItems,
                p_total_amount: total,
                p_shipping_address: {
                    street: 'Calle Demo 123', // Placeholder, replace with actual addressSteps.shipping.address
                    city: 'Madrid', // Placeholder, replace with actual addressSteps.shipping.city
                    zip: '28000', // Placeholder, replace with actual addressSteps.shipping.zip
                    country: 'Spain' // Placeholder, replace with actual addressSteps.shipping.country
                },
                p_guest_email: emailToUse,
                p_coupon_id: coupon?.id || null,
                p_discount_amount: coupon?.discount_amount || 0
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.message);

            const orderId = data.order_id;

            // 3. Create Stripe Checkout Session
            const stripeResponse = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: items,
                    orderId: orderId,
                    email: finalGuestEmail || user?.email,
                    couponId: coupon?.id || null,
                    discountAmount: coupon?.discount_amount || 0,
                }),
            });

            const session = await stripeResponse.json();

            if (session.error) {
                throw new Error(session.error);
            }

            // 4. Redirect to Stripe
            if (session.url) {
                // DON'T clear cart here - let success.astro handle it
                // This way if user cancels, cart is still preserved
                window.location.href = session.url;
            } else {
                throw new Error('No checkout URL received from Stripe');
            }

        } catch (err: any) {
            console.error('Checkout error:', err);
            addNotification('Error al procesar el pago: ' + err.message, 'error');
            setIsLoading(false); // Only stop loading on error, otherwise we are navigating away
        }
    };

    if (showGuestEmailInput) {
        return (
            <div className="w-full space-y-3">
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <p className="text-sm font-bold text-black mb-2 uppercase tracking-wide">Compra como Invitado</p>
                    <p className="text-xs text-gray-600 mb-3">Introduce tu email para enviarte el recibo y seguimiento.</p>
                    <input
                        type="email"
                        placeholder="tu@email.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-black transition-colors"
                        autoFocus
                    />
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowGuestEmailInput(false)}
                            className="flex-1 px-4 py-2 border border-gray-300 text-xs font-bold uppercase tracking-widest hover:border-black transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                if (guestEmail && guestEmail.includes('@')) {
                                    handleCheckout(guestEmail);
                                } else {
                                    addNotification('Por favor, introduce un email válido.', 'warning');
                                }
                            }}
                            disabled={isLoading}
                            className="flex-1 bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? '...' : 'Confirmar'}
                        </button>
                    </div>
                    <div className="mt-3 text-center">
                        <a href="/login?redirect=/carrito" className="text-xs text-gray-500 underline hover:text-black">
                            ¿Ya tienes cuenta? Iniciar Sesión
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={handleInitialClick}
            disabled={isLoading || items.length === 0}
            className="w-full bg-black text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
            {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : null}
            {isLoading ? 'Procesando...' : 'Finalizar Compra'}
        </button>
    );
}
