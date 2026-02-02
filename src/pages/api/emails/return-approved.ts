import type { APIRoute } from 'astro';
import { sendEmail, getReturnApprovedTemplate } from '@/lib/brevo';

export const POST: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { email, customerName, returnNumber, shippingLabel } = await request.json();

    if (!email || !customerName || !returnNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, customerName, returnNumber' }),
        { status: 400 }
      );
    }

    const htmlContent = getReturnApprovedTemplate(customerName, returnNumber, shippingLabel);

    const result = await sendEmail({
      to: email,
      subject: `✓ Devolución aprobada #${returnNumber}`,
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
    console.error('Error sending return approved email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
