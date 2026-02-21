import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendEmail, getNewsletterTemplate } from '@/lib/brevo';

// Delay between each email to avoid hitting Brevo rate limits
const SEND_DELAY_MS = 200;

// Convert plain textarea content to basic HTML paragraphs
function contentToHtml(text: string): string {
  return text
    .split(/\n{2,}/) // split on blank lines
    .map(para => `<p style="margin: 0 0 16px 0; line-height: 1.7; color: #374151; font-size: 15px;">${
      para.trim().replace(/\n/g, '<br>')
    }</p>`)
    .join('');
}

export const POST: APIRoute = async (context) => {
  try {
    const supabase = await createServerSupabaseClient(context, true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const body = await context.request.json();
    const { subject, content } = body;

    if (!subject?.trim() || !content?.trim()) {
      return new Response(
        JSON.stringify({ error: 'El asunto y el contenido son obligatorios' }),
        { status: 400 }
      );
    }

    // Fetch all active subscribers
    const { data: subscribers, error: fetchError } = await supabase
      .from('newsletter_subscribers')
      .select('id, email')
      .eq('is_active', true)
      .order('subscribed_at', { ascending: true });

    if (fetchError) {
      console.error('[Newsletter Send] DB error:', fetchError);
      return new Response(JSON.stringify({ error: 'Error al obtener suscriptores' }), { status: 500 });
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No hay suscriptores activos a quienes enviar' }),
        { status: 400 }
      );
    }

    const siteUrl = context.url.origin;
    const htmlBody = contentToHtml(content);

    let sent = 0;
    let failed = 0;
    const failedEmails: string[] = [];

    for (let i = 0; i < subscribers.length; i++) {
      const sub = subscribers[i];
      try {
        // Build personalised unsubscribe link using subscriber UUID as token
        const unsubscribeUrl = `${siteUrl}/api/newsletter/unsubscribe?token=${sub.id}`;
        const htmlContent = getNewsletterTemplate(unsubscribeUrl, htmlBody);

        const result = await sendEmail({ to: sub.email, subject, htmlContent });

        if (result.success) {
          sent++;
          console.log(`[Newsletter Send] ✓ ${i + 1}/${subscribers.length} → ${sub.email}`);
        } else {
          failed++;
          failedEmails.push(sub.email);
          console.error(`[Newsletter Send] ✗ ${sub.email}:`, result.error);
        }
      } catch (err: any) {
        failed++;
        failedEmails.push(sub.email);
        console.error(`[Newsletter Send] Exception for ${sub.email}:`, err.message);
      }

      // Wait between sends — skip delay after the last email
      if (i < subscribers.length - 1) {
        await new Promise(r => setTimeout(r, SEND_DELAY_MS));
      }
    }

    console.log(`[Newsletter Send] Done. Sent: ${sent}, Failed: ${failed}, Total: ${subscribers.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total: subscribers.length,
        ...(failedEmails.length > 0 && { failedEmails }),
      }),
      { status: 200 }
    );
  } catch (e: any) {
    console.error('[Newsletter Send] Unexpected error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Error interno del servidor' }), { status: 500 });
  }
};
