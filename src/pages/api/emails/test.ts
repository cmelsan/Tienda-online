import type { APIRoute } from 'astro';
import { sendEmail } from '@/lib/brevo';

export const POST: APIRoute = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { email, subject, htmlContent } = await request.json();

    if (!email || !subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, subject, htmlContent' }),
        { status: 400 }
      );
    }

    console.log('[Test Email] Attempting to send test email to:', email);
    console.log('[Test Email] API Key configured:', !!process.env.BREVO_API_KEY);
    console.log('[Test Email] From email:', process.env.FROM_EMAIL);

    const result = await sendEmail({
      to: email,
      subject,
      htmlContent
    });

    console.log('[Test Email] Result:', result);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Test Email] Exception:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
