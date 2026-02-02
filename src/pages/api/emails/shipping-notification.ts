import type { APIRoute } from 'astro';
import { sendEmail, getShippingNotificationTemplate } from '@/lib/brevo';

export const POST: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { email, customerName, trackingNumber, trackingUrl } = await request.json();

    if (!email || !customerName || !trackingNumber || !trackingUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, customerName, trackingNumber, trackingUrl' }),
        { status: 400 }
      );
    }

    const htmlContent = getShippingNotificationTemplate(customerName, trackingNumber, trackingUrl);

    const result = await sendEmail({
      to: email,
      subject: `🚚 Tu pedido ha sido enviado - Seguimiento: ${trackingNumber}`,
      htmlContent
    });

    if (result.success) {
      return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
        status: 200
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: result.error }), {
        status: 500
      });
    }
  } catch (error) {
    console.error('Error sending shipping notification email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
