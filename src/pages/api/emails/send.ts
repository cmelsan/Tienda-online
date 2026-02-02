import type { APIRoute } from 'astro';
import { sendEmail } from '@/lib/brevo';

export const POST: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { to, subject, htmlContent, textContent, cc, bcc, replyTo } = await request.json();

    if (!to || !subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, htmlContent' }),
        { status: 400 }
      );
    }

    const result = await sendEmail({
      to,
      subject,
      htmlContent,
      textContent,
      cc,
      bcc,
      replyTo
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
    console.error('Error sending email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
