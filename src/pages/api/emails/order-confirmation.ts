import type { APIRoute } from 'astro';
import { sendEmail, getOrderConfirmationTemplate } from '@/lib/brevo';

export const POST: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { email, customerName, orderNumber, items, total } = await request.json();

    if (!email || !customerName || !orderNumber || !items || total === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, customerName, orderNumber, items, total' }),
        { status: 400 }
      );
    }

    const htmlContent = getOrderConfirmationTemplate(orderNumber, customerName, items, total);

    const result = await sendEmail({
      to: email,
      subject: `📦 Pedido confirmado #${orderNumber}`,
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
    console.error('Error sending order confirmation email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
