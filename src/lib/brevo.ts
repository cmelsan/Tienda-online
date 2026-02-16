import axios from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@eclatbeauty.com';
const FROM_NAME = process.env.FROM_NAME || 'ÉCLAT Beauty';

interface EmailParams {
  to: string | string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!BREVO_API_KEY) {
    console.error('[Brevo] API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const toList = Array.isArray(params.to) ? params.to : [params.to];

    console.log('[Brevo] Preparing email:', {
      apiKeyPresent: !!BREVO_API_KEY,
      fromEmail: FROM_EMAIL,
      toList,
      subject: params.subject
    });

    const payload = {
      sender: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      to: toList.map(email => ({ email })),
      subject: params.subject,
      htmlContent: params.htmlContent,
      ...(params.textContent && { textContent: params.textContent }),
      ...(params.replyTo && { replyTo: { email: params.replyTo } }),
      ...(params.cc && { cc: params.cc.map(email => ({ email })) }),
      ...(params.bcc && { bcc: params.bcc.map(email => ({ email })) })
    };

    console.log('[Brevo] Sending to API');

    const response = await axios.post(`${BREVO_API_URL}/smtp/email`, payload, {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('[Brevo] Success! Message ID:', response.data.messageId);

    return {
      success: true,
      messageId: response.data.messageId
    };
  } catch (error: any) {
    console.error('[Brevo] Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Template: Confirmación de email
export function getEmailConfirmationTemplate(confirmUrl: string, userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #ec4899; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Bienvenido a ÉCLAT Beauty!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${userName}</strong>,</p>
            <p>Gracias por registrarte en ÉCLAT Beauty. Para completar tu registro y acceder a tu cuenta, por favor confirma tu dirección de correo electrónico haciendo clic en el botón de abajo:</p>
            <center>
              <a href="${confirmUrl}" class="button">Confirmar Email</a>
            </center>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p><code>${confirmUrl}</code></p>
            <p>Este enlace expirará en 24 horas.</p>
            <p style="color: #999; font-size: 12px;">Si no solicitaste este registro, puedes ignorar este correo.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 ÉCLAT Beauty. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template: Confirmación de pedido
export function getOrderConfirmationTemplate(orderNumber: string, customerName: string, items: any[], total: number): string {
  const itemsHtml = items
    .map(
      item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${(item.price / 100).toFixed(2)}€</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .summary { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .total { font-size: 18px; font-weight: bold; color: #ec4899; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Pedido Confirmado!</h1>
            <p>Pedido #${orderNumber}</p>
          </div>
          <div class="content">
            <p>Hola <strong>${customerName}</strong>,</p>
            <p>Gracias por tu compra en ÉCLAT Beauty. Tu pedido ha sido confirmado y pronto será enviado.</p>
            
            <table>
              <thead>
                <tr style="background: #f0f0f0; font-weight: bold;">
                  <td style="padding: 12px;">Producto</td>
                  <td style="padding: 12px; text-align: center;">Cantidad</td>
                  <td style="padding: 12px; text-align: right;">Precio</td>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="summary">
              <div class="total">Total: ${(total / 100).toFixed(2)}€</div>
            </div>

            <p>Tu pedido será preparado y enviado en los próximos 2-3 días hábiles.</p>
            <p>Recibirás un email con el número de seguimiento tan pronto como tu pedido salga de nuestro almacén.</p>
            <p style="color: #999; font-size: 12px;">¿Preguntas? Contáctanos en support@eclatbeauty.com</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 ÉCLAT Beauty. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template: Notificación de envío
export function getShippingNotificationTemplate(customerName: string, trackingNumber?: string, trackingUrl?: string): string {
  const showTracking = trackingNumber && trackingNumber !== 'En proceso' && trackingNumber.trim() !== '';
  
  const trackingSection = showTracking ? `
            <div class="tracking">
              <p><strong>Número de Seguimiento:</strong></p>
              <p style="font-size: 18px; font-weight: bold; color: #ec4899;">${trackingNumber}</p>
              <center>
                <a href="${trackingUrl || '#'}" class="button">Ver Seguimiento</a>
              </center>
            </div>
            <p>Puedes usar el número de seguimiento para monitorear el estado de tu envío en tiempo real.</p>
  ` : `
            <p><strong>El seguimiento detallado estará disponible pronto.</strong></p>
            <center>
              <a href="${trackingUrl || '#'}" class="button">Ver Mi Pedido</a>
            </center>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .tracking { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ec4899; }
          .button { display: inline-block; background: #ec4899; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Tu pedido ha sido enviado!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${customerName}</strong>,</p>
            <p>¡Excelente noticia! Tu pedido ha salido de nuestro almacén y está en camino hacia ti.</p>
            
            ${trackingSection}

            <p>El envío generalmente tarda de 2-5 días hábiles según tu ubicación.</p>
            <p style="color: #999; font-size: 12px;">¿Preguntas? Contáctanos en support@eclatbeauty.com</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 ÉCLAT Beauty. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template: Notificación de entrega completada
export function getDeliveryConfirmedTemplate(customerName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-box { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; text-align: center; }
          .checkmark { font-size: 48px; color: #10b981; margin: 10px 0; }
          .button { display: inline-block; background: #ec4899; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Tu pedido ha sido entregado!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${customerName}</strong>,</p>
            
            <div class="success-box">
              <div class="checkmark">✓</div>
              <p><strong>Tu pedido ha llegado correctamente</strong></p>
            </div>

            <p>Esperamos que disfrutes de tu compra en ÉCLAT Beauty. Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.</p>
            
            <p style="margin-top: 30px;">
              <strong>¿Cómo te fue tu experiencia?</strong>
            </p>
            <p style="color: #999; font-size: 14px;">Tu opinión es muy importante para nosotros. Si estás satisfecho con tu compra, sería maravilloso que dejaras una reseña.</p>
            
            <center>
              <a href="https://claudiaeclat.victoriafp.online/mi-cuenta/pedidos" class="button">Ver Mi Pedido</a>
            </center>

            <p style="color: #999; font-size: 12px; margin-top: 30px;">¿Preguntas? Contáctanos en support@eclatbeauty.com</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 ÉCLAT Beauty. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template: Notificación de devolución aprobada
export function getReturnApprovedTemplate(customerName: string, returnNumber: string, shippingLabel?: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Devolución Aprobada ✓</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${customerName}</strong>,</p>
            <p>Tu solicitud de devolución ha sido aprobada. Aquí están los detalles:</p>
            
            <div class="info-box">
              <p><strong>Número de Devolución:</strong> ${returnNumber}</p>
              ${shippingLabel ? `<p><strong>Etiqueta de Envío:</strong> Se adjunta a este correo</p>` : '<p>Por favor, contacta con soporte para obtener la etiqueta de envío.</p>'}
              <p><strong>Instrucciones:</strong></p>
              <ol>
                <li>Empaca el producto en su condición original</li>
                <li>Adjunta la etiqueta de envío al paquete</li>
                <li>Envía el paquete a la dirección indicada</li>
                <li>Conserva el número de seguimiento</li>
              </ol>
            </div>

            <p>Una vez que recibamos tu devolución, inspeccionaremos el producto y procesaremos el reembolso en 5-7 días hábiles.</p>
            <p style="color: #999; font-size: 12px;">¿Preguntas? Contáctanos en support@eclatbeauty.com</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 ÉCLAT Beauty. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template: Restablecer contraseña
export function getPasswordResetTemplate(resetUrl: string, userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #ec4899; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Restablecer Contraseña</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${userName}</strong>,</p>
            <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva contraseña:</p>
            <center>
              <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
            </center>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p><code>${resetUrl}</code></p>
            <div class="warning">
              <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora. Si no solicitaste este cambio de contraseña, ignora este correo o contáctanos inmediatamente.
            </div>
            <p style="color: #999; font-size: 12px;">Por seguridad, nunca compartimos contraseñas por correo electrónico.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 ÉCLAT Beauty. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template: Email de Bienvenida para Newsletter
export function getNewsletterWelcomeTemplate(email: string, discountCode: string, discountPercentage: number): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .coupon-box { background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #ec4899; text-align: center; }
          .coupon-code { font-size: 32px; font-weight: bold; color: #ec4899; font-family: monospace; letter-spacing: 2px; margin: 15px 0; }
          .coupon-label { font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px; }
          .discount-badge { background: #ec4899; color: white; padding: 8px 15px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
          .button { display: inline-block; background: #ec4899; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
          .benefits { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .benefits li { margin: 10px 0; padding-left: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Bienvenido a ÉCLAT Beauty!</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">Te damos las gracias por suscribirte</p>
          </div>
          <div class="content">
            <p>Hola,</p>
            <p>Gracias por suscribirte a la newsletter de ÉCLAT Beauty. ¡Acabas de obtener un regalo especial!</p>
            
            <div class="coupon-box">
              <p class="coupon-label">Tu código de descuento exclusivo para suscriptores</p>
              <div class="coupon-code">${discountCode}</div>
              <div class="discount-badge">${discountPercentage}% de descuento</div>
              <p style="font-size: 12px; color: #666; margin-top: 15px;">Válido en tu próxima compra</p>
            </div>

            <div class="benefits">
              <p style="font-weight: bold; margin-bottom: 10px;">Como suscriptor de nuestra newsletter recibirás:</p>
              <ul style="list-style: none; padding: 0;">
                <li>✓ Ofertas exclusivas antes que nadie</li>
                <li>✓ Lanzamientos de nuevas colecciones</li>
                <li>✓ Códigos de descuento especiales</li>
                <li>✓ Tips de belleza y cuidado</li>
                <li>✓ Acceso a ventas privadas</li>
              </ul>
            </div>

            <p>Copia el código y úsalo en tu próxima compra para obtener tu descuento.</p>

            <p style="font-size: 12px; color: #999; margin-top: 20px;">Puedes desuscribirte en cualquier momento desde el pie de página de nuestros emails. Esperamos verte pronto.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 ÉCLAT Beauty. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template: Email de Bienvenida con Código de Descuento
export function getWelcomeTemplate(userName: string, discountCode: string, discountPercentage: number): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .coupon-box { background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #ec4899; text-align: center; }
          .coupon-code { font-size: 32px; font-weight: bold; color: #ec4899; font-family: monospace; letter-spacing: 2px; margin: 15px 0; }
          .coupon-label { font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px; }
          .discount-badge { background: #ec4899; color: white; padding: 8px 15px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
          .button { display: inline-block; background: #ec4899; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
          .benefits { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .benefits li { margin: 10px 0; padding-left: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Bienvenido a ÉCLAT Beauty!</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">Tenemos un regalo especial para ti</p>
          </div>
          <div class="content">
            <p>Hola <strong>${userName}</strong>,</p>
            <p>Gracias por crear tu cuenta en ÉCLAT Beauty. ¡Estamos emocionados de tenerte como parte de nuestra comunidad!</p>
            
            <div class="coupon-box">
              <p class="coupon-label">Tu código de descuento de bienvenida</p>
              <div class="coupon-code">${discountCode}</div>
              <div class="discount-badge">${discountPercentage}% de descuento</div>
              <p style="font-size: 12px; color: #666; margin-top: 15px;">Válido en tu primera compra</p>
            </div>

            <div class="benefits">
              <p style="font-weight: bold; margin-bottom: 10px;">Con tu nueva cuenta disfrutarás de:</p>
              <ul style="list-style: none; padding: 0;">
                <li>✓ Acceso exclusivo a ofertas y promociones especiales</li>
                <li>✓ Historial de compras y seguimiento de pedidos</li>
                <li>✓ Lista de deseos personalizada</li>
                <li>✓ Entregas más rápidas</li>
                <li>✓ Atención al cliente prioritaria</li>
              </ul>
            </div>

            <p>Para utilizar tu código de descuento, simplemente cópialo y úsalo al finalizar tu compra.</p>

            <p style="font-size: 12px; color: #999; margin-top: 20px;">Si tienes preguntas, no dudes en contactarnos. Estamos aquí para ayudarte.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 ÉCLAT Beauty. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template: Newsletter
export function getNewsletterTemplate(unsubscribeUrl: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .newsletter-content { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
          a { color: #ec4899; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Newsletter ÉCLAT Beauty</h1>
          </div>
          <div class="content">
            <div class="newsletter-content">
              ${content}
            </div>
            <p style="text-align: center; margin-top: 20px;">
              <a href="${unsubscribeUrl}" style="font-size: 12px; color: #999;">Desuscribirse</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2026 ÉCLAT Beauty. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template: Solicitud de Devolución Recibida
export function getReturnRequestTemplate(customerName: string, orderNumber: string, returnedItems?: { name: string; quantity: number; price: number }[]): string {
  const itemsHtml = returnedItems && returnedItems.length > 0
    ? `<div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #e5e7eb;">
        <p style="font-weight: bold; margin-bottom: 10px; font-size: 14px;">Productos a devolver:</p>
        ${returnedItems.map(item => `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
            <span>${item.name} (x${item.quantity})</span>
            <span style="font-weight: bold;">€${(item.price / 100).toFixed(2)}</span>
          </div>
        `).join('')}
        <div style="display: flex; justify-content: space-between; padding: 10px 0 0; font-weight: bold; font-size: 15px;">
          <span>Reembolso estimado:</span>
          <span style="color: #10b981;">€${(returnedItems.reduce((sum, i) => sum + i.price * i.quantity, 0) / 100).toFixed(2)}</span>
        </div>
      </div>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-box { background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
          .warning-box { background: #fff7ed; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f97316; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
          .label { color: #ec4899; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Solicitud de Devolución Recibida</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${customerName}</strong>,</p>
            <p>Hemos recibido tu solicitud de devolución y ya estamos procesándola.</p>
            
            <div class="success-box">
              <p><span class="label">✓ Devolución #${orderNumber}</span></p>
              <p>Hemos recibido tu solicitud de devolución.</p>
              ${itemsHtml}
            </div>

            <div class="warning-box">
              <p><strong>⚠ Información Importante:</strong></p>
              <p>Una vez recibido y validado el paquete, el reembolso se procesará en tu método de pago original en un plazo de <strong>5 a 7 días hábiles</strong>.</p>
              <p style="margin: 15px 0; padding: 15px; background: white; border-radius: 4px;">
                <strong>Pasos siguientes:</strong><br>
                1. Revisa tu email para descargar la etiqueta de devolución<br>
                2. Empaca el producto en su condición original<br>
                3. Adjunta la etiqueta al paquete<br>
                4. Envía desde cualquier oficina de correos
              </p>
            </div>

            <p>Si tienes alguna pregunta sobre el proceso de devolución, no dudes en contactarnos.</p>
            <p style="color: #999; font-size: 12px;">¿Necesitas ayuda? Contáctanos en support@eclatbeauty.com</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 ÉCLAT Beauty. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template: Reembolso Procesado
export function getRefundProcessedTemplate(customerName: string, orderNumber: string, refundAmount: number): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-box { background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
          .amount-box { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; border-top: 3px solid #ec4899; border-bottom: 3px solid #ec4899; }
          .amount-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
          .amount { font-size: 36px; font-weight: bold; color: #10b981; }
          .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #ec4899; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Reembolso Procesado</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${customerName}</strong>,</p>
            <p>¡Buenas noticias! Tu reembolso ha sido procesado correctamente.</p>
            
            <div class="success-box">
              <p><strong>✓ Pedido #${orderNumber}</strong></p>
              <p>Tu solicitud de devolución ha sido validada y aprobada.</p>
            </div>

            <div class="amount-box">
              <div class="amount-label">Cantidad Reembolsada</div>
              <div class="amount">€ ${(refundAmount / 100).toFixed(2)}</div>
            </div>

            <div class="info-box">
              <p><strong>📅 Información Importante:</strong></p>
              <p>El reembolso se procesará en tu método de pago original en un plazo de <strong>5 a 7 días hábiles</strong>.</p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                Dependiendo de tu banco, el dinero puede tardar unos días más en aparecer en tu cuenta.
              </p>
            </div>

            <p>Gracias por tu compra y esperamos vuelvas pronto.</p>
            <p style="color: #999; font-size: 12px;">¿Preguntas? Contáctanos en support@eclatbeauty.com</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 ÉCLAT Beauty. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
