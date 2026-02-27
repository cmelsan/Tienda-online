/**
 * POST /api/mobile-payment
 *
 * Endpoint exclusivo para el SDK móvil de Flutter (Stripe Native).
 * NO modifica ni reutiliza ningún flujo de la web — es un canal independiente.
 *
 * Flujo:
 *  1. Valida el cuerpo de la petición.
 *  2. Consulta Supabase para obtener precios y stock reales (nunca confíes en el cliente).
 *  3. Aplica la lógica de precios: base vs flash sale vs oferta destacada → precio más bajo.
 *  4. Aplica el descuento de cupón recibido (en céntimos), garantizando el mínimo de Stripe (50 ct).
 *  5. Busca o crea un Customer en Stripe (por email).
 *  6. Genera una EphemeralKey para el SDK móvil.
 *  7. Crea un PaymentIntent con el importe final calculado en servidor.
 *  8. Devuelve { paymentIntent, ephemeralKey, customer, publishableKey }.
 */

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// ─── Constantes ────────────────────────────────────────────────────────────────
const STRIPE_MIN_AMOUNT_CENTS = 50; // 0.50 € mínimo de Stripe
const DEBUG = import.meta.env.DEV;

// ─── Tipos internos ────────────────────────────────────────────────────────────
interface MobilePaymentRequestItem {
    productId: string;
    quantity: number;
}

interface MobilePaymentRequest {
    items: MobilePaymentRequestItem[];
    email: string;
    orderId?: string;
    couponId?: string;
    /** Descuento de cupón en céntimos (ya validado en el cliente, pero se aplica aquí). */
    discountAmount?: number;
}

interface DbProduct {
    id: string;
    name: string;
    price: number;
    stock: number;
    is_flash_sale: boolean;
    flash_sale_discount: number | null;
    flash_sale_end_time: string | null;
}

// ─── Handler ───────────────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
    // ── 0. Variables de entorno ────────────────────────────────────────────────
    // Usamos typeof process !== 'undefined' para evitar ReferenceError en entornos Edge
    const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY ?? (typeof process !== 'undefined' ? process.env.STRIPE_SECRET_KEY : undefined);
    const stripePublishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ?? (typeof process !== 'undefined' ? process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY : undefined);

    if (!stripeSecretKey || !stripePublishableKey) {
        console.error('[MobilePayment] Missing Stripe environment variables.');
        return errorResponse('Server configuration error', 500);
    }

    const stripe = new Stripe(stripeSecretKey as string, {
        // Usamos la misma versión exigida por la librería de Stripe instalada
        apiVersion: '2025-12-15.clover',
    });

    // ── 1. Parsear y validar el cuerpo de la petición ─────────────────────────
    let body: MobilePaymentRequest;
    try {
        body = await request.json();
    } catch {
        return errorResponse('Invalid JSON body', 400);
    }

    const { items, email, discountAmount = 0, orderId = 'no_enviado', couponId = 'no_enviado' } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return errorResponse('items is required and must be a non-empty array', 400);
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
        return errorResponse('A valid email is required', 400);
    }

    // Validar que cada ítem tenga la forma esperada
    for (const item of items) {
        if (!item.productId || typeof item.productId !== 'string') {
            return errorResponse('Each item must have a valid productId', 400);
        }
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
            return errorResponse('Each item must have a quantity ≥ 1', 400);
        }
    }

    // Sanitizar discountAmount: debe ser entero no negativo
    const sanitizedDiscount = Math.max(0, Math.floor(Number(discountAmount) || 0));

    try {
        // ── 2. Consultar Supabase: precios y stock reales ──────────────────────
        const productIds = items.map(i => i.productId);

        const { data: dbProducts, error: productsError } = await supabase
            .from('products')
            .select('id, name, price, stock, is_flash_sale, flash_sale_discount, flash_sale_end_time')
            .in('id', productIds);

        if (productsError || !dbProducts) {
            console.error('[MobilePayment] Error fetching products:', productsError);
            return errorResponse('Failed to validate products', 500);
        }

        // Verificar que todos los productos solicitados existen
        const dbProductMap = new Map<string, DbProduct>(dbProducts.map(p => [p.id, p as DbProduct]));
        for (const item of items) {
            if (!dbProductMap.has(item.productId)) {
                return errorResponse(`Product not found: ${item.productId}`, 404);
            }
        }

        // ── 3. Consultar ofertas destacadas desde app_settings ─────────────────
        const { data: offersData } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'featured_offers')
            .single();

        // Mapa: productId → porcentaje de descuento de oferta destacada
        const featuredOffersMap: Record<string, number> = {};
        if (Array.isArray(offersData?.value)) {
            for (const offer of offersData.value as Array<{ id?: string; discount?: number }>) {
                if (offer.id && typeof offer.discount === 'number' && offer.discount > 0) {
                    featuredOffersMap[offer.id] = offer.discount;
                }
            }
        }

        // ── 4. Calcular el importe total en servidor ───────────────────────────
        const now = new Date();
        let totalAmountCents = 0;
        const lineItems: Array<{ name: string; unitAmount: number; quantity: number }> = [];

        for (const item of items) {
            const product = dbProductMap.get(item.productId)!;

            // 4a. Verificar stock
            if (item.quantity > product.stock) {
                return errorResponse(
                    `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`,
                    409,
                );
            }

            // 4b. Calcular precio efectivo: base vs flash sale vs oferta destacada → mínimo
            const isFlashSaleActive =
                product.is_flash_sale &&
                typeof product.flash_sale_discount === 'number' &&
                product.flash_sale_discount > 0 &&
                (!product.flash_sale_end_time || new Date(product.flash_sale_end_time) > now);

            const flashSalePrice = isFlashSaleActive
                ? Math.round(product.price * (1 - (product.flash_sale_discount as number) / 100))
                : product.price;

            const featuredDiscount = featuredOffersMap[product.id] ?? 0;
            const featuredOfferPrice =
                featuredDiscount > 0
                    ? Math.round(product.price * (1 - featuredDiscount / 100))
                    : product.price;

            // Precio más bajo entre las tres opciones
            const unitAmount = Math.min(product.price, flashSalePrice, featuredOfferPrice);

            if (DEBUG) {
                console.log('[MobilePayment] Price resolution:', {
                    product: product.name,
                    base: product.price,
                    flashSale: flashSalePrice,
                    featured: featuredOfferPrice,
                    effective: unitAmount,
                });
            }
            
            // Asumiendo que el precio no viene en céntimos desde Supabase
            // Si el precio en tu BD ES CON DECIMALES (ej: 15.50 -> 15.5), descomenta la siguiente línea y borra la original
            // totalAmountCents += Math.round(unitAmount * 100) * item.quantity;
            totalAmountCents += unitAmount * item.quantity;
            lineItems.push({ name: product.name, unitAmount, quantity: item.quantity });
        }

        // 4c. Aplicar descuento de cupón (ya validado en servidor por el flujo web;
        //     aquí el importe llega en céntimos desde la app)
        totalAmountCents = Math.max(STRIPE_MIN_AMOUNT_CENTS, totalAmountCents - sanitizedDiscount);

        if (DEBUG) {
            console.log('[MobilePayment] Total after coupon:', {
                subtotal: totalAmountCents + sanitizedDiscount,
                discount: sanitizedDiscount,
                total: totalAmountCents,
            });
        }

        // ── 5. Buscar o crear Customer en Stripe ──────────────────────────────
        const existingCustomers = await stripe.customers.list({ email, limit: 1 });
        const customer =
            existingCustomers.data.length > 0
                ? existingCustomers.data[0]
                : await stripe.customers.create({
                    email,
                    metadata: { source: 'flutter_app' },
                });

        // ── 6. Generar Ephemeral Key para el SDK móvil ────────────────────────
        const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customer.id },
            { apiVersion: '2025-12-15.clover' }, // Debe coincidir con la versión de Stripe
        );

        // ── 7. Crear PaymentIntent ─────────────────────────────────────────────
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmountCents,
            currency: 'eur',
            customer: customer.id,
            // El SDK móvil necesita payment_method_types explícito o automatic_payment_methods
            automatic_payment_methods: { enabled: true },
            metadata: {
                source: 'flutter_app',
                order_id: orderId,
                coupon_id: couponId,
                items_count: items.length.toString(),
                coupon_discount_cents: sanitizedDiscount.toString(),
            },
        });

        // ── 8. Respuesta al SDK móvil ─────────────────────────────────────────
        return new Response(
            JSON.stringify({
                paymentIntent: paymentIntent.client_secret,
                ephemeralKey: ephemeralKey.secret,
                customer: customer.id,
                publishableKey: stripePublishableKey,
                // Info adicional útil para la UI de la app
                amountCents: totalAmountCents,
                currency: 'eur',
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    // CORS: ajusta el origen al dominio de tu API / bundle-id de Flutter
                    'Access-Control-Allow-Origin': '*',
                },
            },
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        console.error('[MobilePayment] Unhandled error:', err);

        // Errores de Stripe tienen un campo `type`
        if (err instanceof Stripe.errors.StripeError) {
            return errorResponse(`Stripe error: ${err.message}`, 402);
        }

        return errorResponse(message, 500);
    }
};

// ─── Preflight CORS para el SDK móvil ─────────────────────────────────────────
export const OPTIONS: APIRoute = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function errorResponse(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
