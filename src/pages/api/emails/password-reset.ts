import type { APIRoute } from 'astro';
import { sendEmail, getPasswordResetTemplate } from '@/lib/brevo';

export const POST: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { email, userName, resetUrl } = await request.json();

    if (!email || !userName || !resetUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, userName, resetUrl' }),
        { status: 400 }
      );
    }

    const htmlContent = getPasswordResetTemplate(resetUrl, userName);

    const result = await sendEmail({
      to: email,
      subject: '🔐 Restablecer tu contraseña en ÉCLAT Beauty',
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
    console.error('Error sending password reset email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
