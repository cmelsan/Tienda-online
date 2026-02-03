import type { APIRoute } from 'astro';
import { sendEmail, getWelcomeTemplate } from '@/lib/brevo';

export const POST: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { email, userName, discountCode = 'BIENVENIDO20', discountPercentage = 20 } = await request.json();

    if (!email || !userName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, userName' }),
        { status: 400 }
      );
    }

    const htmlContent = getWelcomeTemplate(userName, discountCode, discountPercentage);

    const result = await sendEmail({
      to: email,
      subject: '🎉 ¡Bienvenido a ÉCLAT Beauty! Tu código de descuento está aquí',
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
    console.error('Error sending welcome email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
