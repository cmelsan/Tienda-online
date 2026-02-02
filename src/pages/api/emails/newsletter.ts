import type { APIRoute } from 'astro';
import { sendEmail, getNewsletterTemplate } from '@/lib/brevo';

export const POST: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { email, unsubscribeUrl, content, subject = '📧 Newsletter ÉCLAT Beauty' } = await request.json();

    if (!email || !content || !unsubscribeUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, content, unsubscribeUrl' }),
        { status: 400 }
      );
    }

    const htmlContent = getNewsletterTemplate(unsubscribeUrl, content);

    const result = await sendEmail({
      to: email,
      subject,
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
    console.error('Error sending newsletter email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
