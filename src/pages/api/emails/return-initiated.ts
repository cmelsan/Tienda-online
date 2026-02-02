import type { APIRoute } from 'astro';
import { sendEmail } from '@/lib/brevo';
import { createServerSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { orderId, customerEmail, customerName, returnReason } = await request.json();

        if (!orderId || !customerEmail) {
            return new Response(JSON.stringify({ success: false, message: 'Order ID and email are required' }), { status: 400 });
        }

        // Get return label
        const labelUrl = `/api/orders/generate-return-label`;

        // Send return confirmation email
        const emailResult = await sendEmail({
            to: customerEmail,
            subject: '📦 Solicitud de Devolución Aceptada - ÉCLAT Beauty',
            htmlContent: getReturnConfirmationTemplate(orderId, customerName, returnReason)
        });

        if (!emailResult.success) {
            console.error('[Return Email] Send failed:', emailResult.error);
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'Email sending failed',
                details: emailResult.error 
            }), { status: 500 });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Return confirmation email sent',
            messageId: emailResult.messageId
        }), { status: 200 });

    } catch (err: any) {
        console.error('[Return Email API] Error:', err);
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
    }
};

function getReturnConfirmationTemplate(orderId: string, customerName: string, reason: string): string {
    const shortOrderId = orderId.slice(0, 8).toUpperCase();
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solicitud de Devolución Aceptada - ÉCLAT Beauty</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #000 0%, #333 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            letter-spacing: 1px;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 20px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
        }
        .status-box {
            background: #f0f7ff;
            border-left: 4px solid #0066cc;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .status-box strong {
            color: #0066cc;
        }
        .info-section {
            background: #fafafa;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
            border: 1px solid #eee;
        }
        .info-section h3 {
            margin: 0 0 12px 0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #000;
        }
        .info-section p {
            margin: 8px 0;
            font-size: 13px;
        }
        .address-box {
            background: white;
            border: 2px solid #000;
            padding: 15px;
            margin: 10px 0;
            font-weight: bold;
            line-height: 1.8;
        }
        .timeline {
            margin: 20px 0;
        }
        .timeline-item {
            display: flex;
            margin-bottom: 15px;
        }
        .timeline-icon {
            width: 30px;
            height: 30px;
            background: #000;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 15px;
            flex-shrink: 0;
        }
        .timeline-content {
            flex: 1;
        }
        .timeline-content h4 {
            margin: 0 0 5px 0;
            font-size: 13px;
            font-weight: bold;
        }
        .timeline-content p {
            margin: 0;
            font-size: 12px;
            color: #666;
        }
        .warning-box {
            background: #fff3cd;
            border: 2px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .warning-box strong {
            color: #856404;
        }
        .warning-box p {
            margin: 8px 0;
            font-size: 13px;
            color: #856404;
        }
        .button {
            display: inline-block;
            background: #000;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            font-size: 13px;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .footer {
            background: #f5f5f5;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
        }
        .footer a {
            color: #0066cc;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 DEVOLUCIÓN ACEPTADA</h1>
            <p>Tu solicitud ha sido recibida correctamente</p>
        </div>

        <div class="content">
            <div class="greeting">
                <p>Hola <strong>${customerName}</strong>,</p>
                <p>Gracias por solicitar una devolución. Tu solicitud ha sido aceptada y procesada correctamente.</p>
            </div>

            <!-- Status Box -->
            <div class="status-box">
                <p>📋 <strong>Referencia de Devolución:</strong> ${shortOrderId}</p>
            </div>

            <!-- Motivo -->
            <div class="info-section">
                <h3>Motivo de Devolución</h3>
                <p>${reason}</p>
            </div>

            <!-- Instrucciones de Envío -->
            <div class="info-section">
                <h3>📬 Instrucciones de Envío</h3>
                <p>Por favor, devuelve los productos a la siguiente dirección:</p>
                <div class="address-box">
                    ÉCLAT BEAUTY - Centro de Devoluciones<br>
                    Calle de la Moda 123<br>
                    Polígono Industrial Vallecas<br>
                    28031 Madrid, España<br><br>
                    Referencia: ${shortOrderId}
                </div>
                <p><strong>Importante:</strong> Asegúrate de incluir esta referencia en el paquete.</p>
            </div>

            <!-- Timeline -->
            <div class="info-section">
                <h3>⏱️ Proceso de Devolución</h3>
                <div class="timeline">
                    <div class="timeline-item">
                        <div class="timeline-icon">1</div>
                        <div class="timeline-content">
                            <h4>Prepara tu paquete</h4>
                            <p>Empaqueta el producto en su embalaje original. Imprime esta etiqueta de devolución.</p>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-icon">2</div>
                        <div class="timeline-content">
                            <h4>Envía</h4>
                            <p>Envía el paquete a la dirección anterior usando cualquier servicio de correos. Conserva el número de seguimiento.</p>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-icon">3</div>
                        <div class="timeline-content">
                            <h4>Recepción y validación</h4>
                            <p>Una vez recibido en nuestros almacenes, inspeccionaremos el producto (2-3 días hábiles).</p>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-icon">4</div>
                        <div class="timeline-content">
                            <h4>Reembolso procesado</h4>
                            <p>Una vez validado, procesaremos el reembolso en tu método de pago original.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Warning -->
            <div class="warning-box">
                <p>⚠️ <strong>Información Importante sobre Reembolsos</strong></p>
                <p>Una vez recibido y validado el paquete en nuestros almacenes, el reembolso se procesará en tu método de pago original en un plazo de <strong>5 a 7 días hábiles</strong>.</p>
                <p>Por favor, ten en cuenta que los bancos pueden tardar un tiempo adicional en reflejar el dinero en tu cuenta.</p>
            </div>

            <!-- CTA -->
            <div style="text-align: center;">
                <p style="margin: 20px 0 10px 0; font-size: 13px;">¿Necesitas la etiqueta de devolución?</p>
                <a href="${labelUrl}?orderId=${orderId}" class="button">Descargar Etiqueta</a>
            </div>

            <!-- Contact -->
            <div class="info-section">
                <h3>❓ ¿Tienes dudas?</h3>
                <p><strong>Email:</strong> soporte@eclatbeauty.com</p>
                <p><strong>Teléfono:</strong> +34 91 123 4567</p>
                <p><strong>Horario:</strong> Lunes a Viernes, 10:00 - 18:00 CET</p>
                <p style="margin-top: 15px; font-size: 12px; color: #666;">Nuestro equipo está aquí para ayudarte con cualquier duda sobre tu devolución.</p>
            </div>
        </div>

        <div class="footer">
            <p>© 2025 ÉCLAT Beauty. Todos los derechos reservados.</p>
            <p><a href="https://claudiaeclat.victoriafp.online">Visita nuestra tienda</a></p>
        </div>
    </div>
</body>
</html>
    `;
}
