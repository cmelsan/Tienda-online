import type { APIRoute } from 'astro';

/**
 * Endpoint para confirmar que el carrito ha sido vaciado después del pago
 * Usado por /checkout/success para registrar el evento
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        const { orderId, email, itemsCount, discountApplied } = await request.json();

        console.log('[Checkout Confirmation] Carrito vaciado exitosamente', {
            orderId,
            email,
            itemsCount,
            discountApplied,
            timestamp: new Date().toISOString()
        });

        return new Response(JSON.stringify({
            success: true,
            message: 'Carrito confirmado como vaciado',
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('[Checkout Confirmation] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
