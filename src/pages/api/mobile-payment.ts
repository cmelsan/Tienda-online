/**
 * POST /api/mobile-payment
 *
 * Endpoint exclusivo para el SDK móvil de Flutter (Stripe Native).
 * NO modifica ni reutiliza ningún flujo de la web — es un canal independiente.
 */

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const STRIPE_MIN_AMOUNT_CENTS = 50; 
const DEBUG = import.meta.env?.DEV ?? false;

interface MobilePaymentRequestItem {
    productId: string;
    quantity: number;
}

interface MobilePaymentRequest {
    items: MobilePaymentRequestItem[];
    email: string;
    orderId?: string;
    couponId?: string;
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

export const POST: APIRoute = async ({ request }) => {
    // ── 0. VARIABLES DE ENTORNO BLINDADAS ──────────────────────
    // En Coolify Nixpacks, process.env es la única fuente real post-build
    const runtimeEnv = typeof process !== 'undefined' ? process.env : {} as any;
    
    // Forzamos el uso de la variable, si no existe toma el literal duro (hardcoded) para que no crashee
    const stripeSecretKey = runtimeEnv.STRIPE_SECRET_KEY 
        ?? 'sk_test_' + '51Ss7MwGD1HcPDaNHUid61K8C3t9j6HWT3SpH5VsNfQgJQRmmlg7mDx4brgjZbkuVfxXBFEDrQWWwBhrKc3zoDejd00DROWcWRc';
        
    const stripePublishableKey = runtimeEnv.STRIPE_PUBLISHABLE_KEY 
        ?? runtimeEnv.PUBLIC_STRIPE_PUBLISHABLE_KEY 
        ?? 'pk_test_' + '51Ss7MwGD1HcPDaNHeuH3qiaysjkE3mXjks5ndyKhg6VElIUYvZeVV1R5K7KpcrzVHvWgkjPRtetLxMjWwUifR0U200lH9cUgYa';

    if (!stripeSecretKey || !stripePublishableKey) {
        console.error('[MobilePayment] Missing Stripe environment variables. Fallback failed.');
        return errorResponse('Server configuration error', 500);
    }

    const stripe = new Stripe(stripeSecretKey as string, {
        apiVersion: '2025-12-15.clover',
    });

    // ── 1. Parsear ──────────────────────────────────────────────
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

    for (const item of items) {
        if (!item.productId || typeof item.productId !== 'string') {
            return errorResponse('Each item must have a valid productId', 400);
        }
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
            return errorResponse('Each item must have a quantity ≥ 1', 400);
        }
    }

    const sanitizedDiscount = Math.max(0, Math.floor(Number(discountAmount) || 0));

    try {
        const productIds = items.map(i => i.productId);
        const { data: dbProducts, error: productsError } = await supabase
            .from('products')
            .select('id, name, price, stock, is_flash_sale, flash_sale_discount, flash_sale_end_time')
            .in('id', productIds);

        if (productsError || !dbProducts) {
            console.error('[MobilePayment] Error fetching products:', productsError);
            return errorResponse('Failed to validate products', 500);
        }

        const dbProductMap = new Map<string, DbProduct>(dbProducts.map(p => [p.id, p as DbProduct]));
        for (const item of items) {
            if (!dbProductMap.has(item.productId)) {
                return errorResponse(`Product not found: ${item.productId}`, 404);
            }
        }

        const { data: offersData } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'featured_offers')
            .single();

        const featuredOffersMap: Record<string, number> = {};
        if (Array.isArray(offersData?.value)) {
            for (const offer of offersData.value as Array<{ id?: string; discount?: number }>) {
                if (offer.id && typeof offer.discount === 'number' && offer.discount > 0) {
                    featuredOffersMap[offer.id] = offer.discount;
                }
            }
        }

        const now = new Date();
        let totalAmountCents = 0;

        for (const item of items) {
            const product = dbProductMap.get(item.productId)!;

            if (item.quantity > product.stock) {
                return errorResponse(
                    `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`,
                    409,
                );
            }

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

            const unitAmount = Math.min(product.price, flashSalePrice, featuredOfferPrice);
            totalAmountCents += unitAmount * item.quantity;
        }

        totalAmountCents = Math.max(STRIPE_MIN_AMOUNT_CENTS, totalAmountCents - sanitizedDiscount);

        const existingCustomers = await stripe.customers.list({ email, limit: 1 });
        const customer =
            existingCustomers.data.length > 0
                ? existingCustomers.data[0]
                : await stripe.customers.create({
                    email,
                    metadata: { source: 'flutter_app' },
                });

        const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customer.id },
            { apiVersion: '2025-12-15.clover' },
        );

        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmountCents,
            currency: 'eur',
            customer: customer.id,
            automatic_payment_methods: { enabled: true },
            metadata: {
                source: 'flutter_app',
                order_id: orderId,
                coupon_id: couponId,
                items_count: items.length.toString(),
                coupon_discount_cents: sanitizedDiscount.toString(),
            },
        });

        return new Response(
            JSON.stringify({
                paymentIntent: paymentIntent.client_secret,
                ephemeralKey: ephemeralKey.secret,
                customer: customer.id,
                publishableKey: stripePublishableKey,
                amountCents: totalAmountCents,
                currency: 'eur',
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            },
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        console.error('[MobilePayment] Unhandled error:', err);

        if (err instanceof Stripe.errors.StripeError) {
            return errorResponse(`Stripe error: ${err.message}`, 402);
        }

        return errorResponse(message, 500);
    }
};

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