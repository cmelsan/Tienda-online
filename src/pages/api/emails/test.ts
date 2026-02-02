import type { APIRoute } from 'astro';
import { sendEmail } from '@/lib/brevo';

export const GET: APIRoute = async ({ request }) => {
  // GET para prueba rápida
  const email = new URL(request.url).searchParams.get('email') || 'test@example.com';
  
  console.log('[Test Email GET] Testing with email:', email);
  console.log('[Test Email GET] BREVO_API_KEY exists:', !!process.env.BREVO_API_KEY);
  console.log('[Test Email GET] FROM_EMAIL:', process.env.FROM_EMAIL);

  const htmlContent = `
    <h1>Email de Prueba ÉCLAT Beauty</h1>
    <p>Si recibiste este email, el sistema de notificaciones funciona correctamente.</p>
    <p>Tiempo: ${new Date().toLocaleString()}</p>
  `;

  const result = await sendEmail({
    to: email,
    subject: '🧪 Email de Prueba - ÉCLAT Beauty',
    htmlContent
  });

  console.log('[Test Email GET] Result:', result);

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

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

    console.log('[Test Email POST] Attempting to send to:', email);
    console.log('[Test Email POST] API Key configured:', !!process.env.BREVO_API_KEY);
    console.log('[Test Email POST] From email:', process.env.FROM_EMAIL);

    const result = await sendEmail({
      to: email,
      subject,
      htmlContent
    });

    console.log('[Test Email POST] Result:', result);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[Test Email POST] Exception:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
