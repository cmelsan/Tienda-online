import type { APIRoute } from 'astro';
import { sendEmail, getEmailConfirmationTemplate } from '@/lib/brevo';

export const POST: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { email, userName, confirmUrl } = await request.json();

    if (!email || !userName || !confirmUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, userName, confirmUrl' }),
        { status: 400 }
      );
    }

    const htmlContent = getEmailConfirmationTemplate(confirmUrl, userName);

    const result = await sendEmail({
      to: email,
      subject: '✉️ Confirma tu email en ÉCLAT Beauty',
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
    console.error('Error sending confirmation email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
