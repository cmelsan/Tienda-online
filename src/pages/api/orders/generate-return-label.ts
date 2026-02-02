import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId } = await request.json();

        if (!orderId) {
            return new Response(JSON.stringify({ success: false, message: 'Order ID is required' }), { status: 400 });
        }

        const supabase = await createServerSupabaseClient({ cookies });

        // Verify session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
        }

        // Fetch order details
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, user_id, created_at, status')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return new Response(JSON.stringify({ success: false, message: 'Order not found' }), { status: 404 });
        }

        // Verify ownership
        if (order.user_id !== session.user.id) {
            return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
        }

        // Generate simple HTML PDF-like content for return label
        const labelHtml = generateReturnLabel(order);

        // Return as base64 for easy browser handling
        const base64Content = Buffer.from(labelHtml).toString('base64');

        return new Response(JSON.stringify({
            success: true,
            label: base64Content,
            filename: `etiqueta-devolucion-${order.id.slice(0, 8)}.html`
        }), { status: 200 });

    } catch (err: any) {
        console.error('Generate return label error:', err);
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
    }
};

function generateReturnLabel(order: any): string {
    const orderId = order.id.slice(0, 12).toUpperCase();
    const today = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Etiqueta de Devolución - ÉCLAT Beauty</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Arial', sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #000;
            padding-bottom: 20px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 2px;
        }
        .title {
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .section {
            margin-bottom: 30px;
            border: 2px solid #e0e0e0;
            padding: 20px;
            background: #fafafa;
        }
        .section-title {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 12px;
            letter-spacing: 1px;
        }
        .address-box {
            background: white;
            padding: 15px;
            border: 2px solid #000;
            font-size: 14px;
            line-height: 1.8;
        }
        .qr-code {
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background: white;
        }
        .order-number {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            letter-spacing: 2px;
            word-break: break-all;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        .info-item {
            background: white;
            padding: 12px;
            border: 1px solid #ddd;
        }
        .info-label {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 5px;
        }
        .info-value {
            font-size: 14px;
            font-weight: bold;
        }
        .warning {
            background: #fff3cd;
            border: 2px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .warning-title {
            font-weight: bold;
            color: #856404;
            margin-bottom: 8px;
        }
        .warning-text {
            font-size: 12px;
            color: #856404;
            line-height: 1.6;
        }
        .instructions {
            background: #f0f7ff;
            border-left: 4px solid #0066cc;
            padding: 15px;
            margin: 20px 0;
        }
        .instructions-title {
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 8px;
        }
        .instructions-text {
            font-size: 12px;
            color: #333;
            line-height: 1.6;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 11px;
            color: #999;
        }
        @media print {
            body {
                padding: 0;
            }
            .container {
                box-shadow: none;
                max-width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">ÉCLAT BEAUTY</div>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">ETIQUETA DE DEVOLUCIÓN</div>
        </div>

        <!-- Order Number -->
        <div class="order-number">
            Pedido: ${orderId}
        </div>

        <!-- Datos de Envío -->
        <div class="section">
            <div class="section-title">📦 Envía tu devolución a:</div>
            <div class="address-box">
                <strong>ÉCLAT BEAUTY - Centro de Devoluciones</strong><br>
                Calle de la Moda 123<br>
                Polígono Industrial Vallecas<br>
                28031 Madrid<br>
                España<br><br>
                <strong>Tel:</strong> +34 91 123 4567<br>
                <strong>Referencia:</strong> ${orderId}
            </div>
        </div>

        <!-- Instrucciones -->
        <div class="instructions">
            <div class="instructions-title">📋 Instrucciones Importantes:</div>
            <div class="instructions-text">
                <strong>1. Empaquetado:</strong> Asegúrate de devolver los productos en su embalaje original y en buen estado.<br><br>
                <strong>2. Incluir:</strong> Coloca esta etiqueta dentro o pegada en el exterior del paquete.<br><br>
                <strong>3. Envío:</strong> Puedes usar cualquier servicio de correos (Correos, UPS, DHL, etc.).<br><br>
                <strong>4. Número de Seguimiento:</strong> Guarda el número de seguimiento de tu envío para poder rastrear la devolución.
            </div>
        </div>

        <!-- Aviso Importante -->
        <div class="warning">
            <div class="warning-title">⚠️ Aviso Importante - Reembolso</div>
            <div class="warning-text">
                Una vez recibido y validado el paquete en nuestros almacenes, el reembolso se procesará en tu método de pago original en un plazo de <strong>5 a 7 días hábiles</strong>. 
                Recibirás un email de confirmación cuando se procese el reembolso.
            </div>
        </div>

        <!-- Info Grid -->
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Fecha de Solicitud</div>
                <div class="info-value">${today}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Plazo de Devolución</div>
                <div class="info-value">30 días</div>
            </div>
        </div>

        <!-- Contact -->
        <div class="section">
            <div class="section-title">❓ ¿Tienes dudas?</div>
            <div style="font-size: 13px; color: #333; line-height: 1.8;">
                Contacta con nuestro equipo de atención al cliente:<br><br>
                <strong>Email:</strong> soporte@eclatbeauty.com<br>
                <strong>Teléfono:</strong> +34 91 123 4567<br>
                <strong>Horario:</strong> Lunes a Viernes, 10:00 - 18:00 CET<br>
            </div>
        </div>

        <div class="footer">
            <p>Gracias por tu compra en ÉCLAT Beauty.</p>
            <p>Generado el ${today}</p>
        </div>
    </div>
</body>
</html>
    `;
}
