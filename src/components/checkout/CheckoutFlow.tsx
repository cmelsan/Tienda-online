import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@nanostores/react';
import { cartItems, cartTotal, cartSubtotal, appliedCoupon, applyCoupon, removeCoupon } from '@/stores/cart';
import { getOrCreateSessionId, clearSessionId } from '@/lib/sessionManager';
import EmailStep from './EmailStep';
import AddressStep from './AddressStep';
import { formatPrice } from '@/lib/utils';

// Steps definition
type CheckoutStep = 'email' | 'address' | 'shipping' | 'payment';

export default function CheckoutFlow() {
    const [step, setStep] = useState<CheckoutStep>('email');
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Checkout State
    const [email, setEmail] = useState('');
    const [isGuest, setIsGuest] = useState(true);
    const [shippingAddress, setShippingAddress] = useState<any>(null);

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [couponSuccess, setCouponSuccess] = useState('');

    const items = useStore(cartItems);
    const subtotal = useStore(cartSubtotal);
    const total = useStore(cartTotal);
    const coupon = useStore(appliedCoupon);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUser(session.user);
            setEmail(session.user.email || '');
            setIsGuest(false);
            setStep('address'); // Skip email step if logged in
        }
        setLoading(false);
    };

    const handleEmailContinue = async (inputEmail: string, registerData?: { password: string }) => {
        setEmail(inputEmail);

        if (registerData) {
            setProcessing(true);
            try {
                // 1. Sign Up
                const { data: authData, error } = await supabase.auth.signUp({
                    email: inputEmail,
                    password: registerData.password,
                    options: {
                        data: {
                            full_name: '', // Can ask later
                        }
                    }
                });

                if (error) throw error;

                if (authData.user) {
                    // 2. Migrate Cart
                    const sessionId = getOrCreateSessionId();
                    const { error: migrationError } = await supabase.rpc('migrate_guest_cart_to_user', {
                        p_session_id: sessionId,
                        p_user_id: authData.user.id
                    });

                    if (migrationError) console.error('Migration error:', migrationError);

                    // 3. Clear session locally
                    clearSessionId();

                    setUser(authData.user);
                    setIsGuest(false);
                }
            } catch (err: any) {
                alert('Error al crear cuenta: ' + err.message);
                setProcessing(false);
                return;
            }
            setProcessing(false);
        }

        setStep('address');
    };

    const handleAddressContinue = (address: any) => {
        setShippingAddress(address);
        setStep('payment');
    };

    const handleLogin = () => {
        window.location.href = `/login?redirect=/checkout`;
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) {
            setCouponError('Ingresa un código de descuento');
            setCouponSuccess('');
            return;
        }

        setCouponLoading(true);
        setCouponError('');
        setCouponSuccess('');

        try {
            const response = await fetch('/api/checkout/validate-coupon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: couponCode,
                    totalAmount: subtotal
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setCouponError(data.error || 'Código inválido');
                setCouponSuccess('');
                return;
            }

            if (data.valid) {
                applyCoupon({
                    code: data.coupon.code,
                    id: data.coupon.id,
                    discount_value: data.coupon.discount_value,
                    discount_type: data.coupon.discount_type,
                    discount_amount: data.coupon.discount_amount
                });
                setCouponCode('');
                setCouponError('');
                // Show success message
                setCouponSuccess(`✓ Cupón aplicado: ${formatPrice(data.coupon.discount_amount)} de descuento`);
                // Auto-clear success message after 5 seconds
                setTimeout(() => setCouponSuccess(''), 5000);
            }
        } catch (error: any) {
            setCouponError('Error de conexión: ' + error.message);
            setCouponSuccess('');
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        removeCoupon();
        setCouponCode('');
        setCouponError('');
        setCouponSuccess('');
    };

    const handlePayment = async () => {
        if (!email || !shippingAddress) {
            alert('Por favor completa todos los pasos anteriores');
            return;
        }

        setProcessing(true);
        try {
            const itemsArray = Object.values(items).map((item: any) => ({
                product_id: item.product.id,
                quantity: item.quantity,
                // Use discounted price if available, otherwise use regular price
                price: item.product.discountedPrice || item.product.price,
                product: item.product,
            }));

            // Get customer name from user session or shipping address
            const customerName = user?.user_metadata?.full_name || shippingAddress?.fullName || 'Cliente';

            // Step 1: Create order
            const createOrderResponse = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: itemsArray,
                    email,
                    shippingAddress,
                    couponId: coupon?.id || null,
                    discountAmount: coupon?.discount_amount || 0,
                    total: total,
                    customerName
                })
            });

            const orderData = await createOrderResponse.json();

            if (!createOrderResponse.ok || !orderData.success) {
                alert(orderData.message || 'Error al crear la orden');
                setProcessing(false);
                return;
            }

            const orderId = orderData.order_id;
            const orderNumber = orderData.order_number;
            console.log('Order created:', orderId, 'Order Number:', orderNumber);

            // Save order number to localStorage for success page
            if (typeof window !== 'undefined') {
                localStorage.setItem('eclat:lastOrderNumber', orderNumber);
            }

            // Step 2: Create Stripe checkout session
            const stripeResponse = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: itemsArray,
                    orderId: orderId,
                    email: email,
                    discountAmount: coupon?.discount_amount || 0,
                    finalTotal: total
                })
            });

            const stripeData = await stripeResponse.json();

            if (!stripeResponse.ok || !stripeData.url) {
                alert(stripeData.error || 'Error al crear sesión de pago');
                setProcessing(false);
                return;
            }

            // Step 3: Redirect to Stripe
            // NOTA: El carrito y cupón se limpiarán en /checkout/success después del pago
            console.log('[Checkout] Redirigiendo a Stripe - URL:', stripeData.url);
            window.location.href = stripeData.url;
        } catch (error: any) {
            alert('Error: ' + error.message);
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-12 text-center">Cargando checkout...</div>;

    if (Object.keys(items).length === 0) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
                <a href="/productos" className="text-blue-600 underline">Volver a la tienda</a>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Steps Column */}
            <div className="lg:col-span-2 space-y-8">

                {/* Email Step */}
                <div className={`border p-6 rounded ${step === 'email' ? 'border-black' : 'border-gray-200'}`}>
                    <h3 className="font-bold text-lg mb-4 flex items-center">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2 ${step === 'email' ? 'border-black bg-black text-white' : 'bg-green-600 text-white'}`}>
                            {step === 'email' ? '1' : '✓'}
                        </span>
                        Contacto
                        {step !== 'email' && <span className="ml-auto text-sm font-normal text-gray-500">{email}</span>}
                        {step !== 'email' && !user && <button onClick={() => setStep('email')} className="ml-4 text-sm underline text-black">Editar</button>}
                    </h3>

                    {step === 'email' && (
                        <EmailStep
                            initialEmail={email}
                            onContinue={handleEmailContinue}
                            onLogin={handleLogin}
                        />
                    )}
                    {processing && step === 'email' && <p className="text-sm text-center mt-2">Creando cuenta...</p>}
                </div>

                {/* Address Step */}
                <div className={`border p-6 rounded ${step === 'address' ? 'border-black' : 'border-gray-200 opacity-50'}`}>
                    <h3 className="font-bold text-lg mb-4 flex items-center">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2 ${step === 'address' ? 'bg-black text-white' : step === 'email' ? 'bg-gray-200' : 'bg-green-600 text-white'}`}>
                            {step === 'address' ? '2' : (step === 'email' ? '2' : '✓')}
                        </span>
                        Envío
                        {shippingAddress && step !== 'address' && <span className="ml-auto text-sm font-normal text-gray-500">{shippingAddress.street}, {shippingAddress.city}</span>}
                        {step !== 'address' && step !== 'email' && <button onClick={() => setStep('address')} className="ml-4 text-sm underline text-black">Editar</button>}
                    </h3>
                    {step === 'address' && (
                        <AddressStep
                            user={user}
                            onContinue={handleAddressContinue}
                            onBack={() => setStep('email')}
                        />
                    )}
                </div>

                {/* Payment Step */}
                <div className={`border p-6 rounded ${step === 'payment' ? 'border-black' : 'border-gray-200 opacity-50'}`}>
                    <h3 className="font-bold text-lg mb-4 flex items-center">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2 ${step === 'payment' ? 'bg-black text-white' : 'bg-gray-200'}`}>3</span>
                        Pago
                    </h3>
                    {step === 'payment' && (
                        <div>
                            <button
                                onClick={handlePayment}
                                disabled={processing}
                                className="w-full bg-black text-white py-3 rounded font-bold hover:bg-gray-800 disabled:bg-gray-400 mb-4"
                            >
                                {processing ? 'Procesando...' : 'Continuar a Pago Seguro (Stripe)'}
                            </button>
                            <p className="text-xs text-gray-500 text-center">Serás redirigido a Stripe para completar el pago de forma segura</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Summary Column */}
            <div className="bg-gray-50 p-6 rounded h-fit">
                <h3 className="font-bold text-lg mb-4">Resumen del Pedido</h3>
                <div className="space-y-4">
                    {Object.values(items).map((item: any) => (
                        <div key={item.product.id} className="flex gap-4">
                            <div className="w-16 h-16 bg-white rounded border overflow-hidden">
                                {item.product.images?.[0] && <img src={item.product.images[0]} className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{item.product.name}</p>
                                <p className="text-sm text-gray-500">Cant: {item.quantity}</p>
                            </div>
                            <p className="text-sm font-bold">{(item.product.price * item.quantity / 100).toFixed(2)}€</p>
                        </div>
                    ))}

                    <div className="border-t pt-4 mt-4">
                        {/* Coupon Section */}
                        {!coupon ? (
                            <div className="mb-4">
                                <label className="text-sm font-medium text-gray-700 block mb-2">Código de Descuento</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ingresa tu código"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        disabled={couponLoading}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                                    />
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={couponLoading}
                                        className="px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                                    >
                                        {couponLoading ? 'Validando...' : 'Aplicar'}
                                    </button>
                                </div>
                                {couponError && (
                                    <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded border border-red-200">
                                        {couponError}
                                    </div>
                                )}
                                {couponSuccess && (
                                    <div className="text-green-600 text-xs mt-2 p-2 bg-green-50 rounded border border-green-200">
                                        {couponSuccess}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm font-medium text-green-900">✓ Descuento aplicado</p>
                                    <button
                                        onClick={handleRemoveCoupon}
                                        className="text-xs text-green-600 hover:text-green-800 underline"
                                    >
                                        Remover
                                    </button>
                                </div>
                                <p className="text-xs text-green-700">{coupon.code} - Descuento: {formatPrice(coupon.discount_amount)}</p>
                            </div>
                        )}

                        {/* Totals */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            {coupon && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Descuento</span>
                                    <span>-{formatPrice(coupon.discount_amount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Total</span>
                                <span>{formatPrice(total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
