import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendEmail, getNewsletterWelcomeTemplate } from '@/lib/brevo';

export const POST: APIRoute = async (context) => {
    const { request } = context;
    try {
        const data = await request.json();
        const { email } = data;

        if (!email || !email.includes('@')) {
            return new Response(JSON.stringify({ message: 'Email inválido' }), { status: 400 });
        }

        // Log the attempt
        console.log('[Newsletter] Processing subscription for:', email);

        // 1. Check if Brevo API is configured
        if (!process.env.BREVO_API_KEY) {
            console.error('[Newsletter] ERROR: BREVO_API_KEY not configured!');
            return new Response(JSON.stringify({ message: 'Servicio de email no configurado. Por favor contacta a soporte.' }), { status: 500 });
        }

        // Use service-role client to bypass RLS for DB checks
        const supabase = await createServerSupabaseClient(context, true);

        // 2. Check if already subscribed (active or inactive)
        console.log('[Newsletter] Checking existing subscriber...');
        const { data: existing } = await supabase
          .from('newsletter_subscribers')
          .select('id, is_active')
          .eq('email', email)
          .maybeSingle();

        if (existing) {
          if (existing.is_active) {
            return new Response(JSON.stringify({ message: 'Este email ya está suscrito.' }), { status: 409 });
          }
          // Inactive subscriber — reactivate them
          console.log('[Newsletter] Reactivating inactive subscriber:', email);
          await supabase
            .from('newsletter_subscribers')
            .update({ is_active: true })
            .eq('id', existing.id);
        }

        // 3. Send welcome email
        console.log('[Newsletter] Sending welcome email...');
        const htmlContent = getNewsletterWelcomeTemplate(email, 'NEWSLETTER10', 10);
        
        const emailResult = await sendEmail({
            to: email,
            subject: '🎉 ¡Bienvenido a la Newsletter ÉCLAT Beauty! Tu código de descuento está aquí',
            htmlContent
        });

        if (!emailResult.success) {
            console.error('[Newsletter] Failed to send welcome email:', emailResult.error);
            return new Response(JSON.stringify({ message: 'Error al enviar email de bienvenida. Por favor intenta de nuevo.' }), { status: 500 });
        }

        console.log('[Newsletter] Email sent successfully, messageId:', emailResult.messageId);

        // 4. Save to DB — only if brand-new subscriber (reactivations already handled above)
        if (!existing) {
          const { error } = await supabase
              .from('newsletter_subscribers')
              .insert({ email });

          if (error) {
              console.error('[Newsletter] Database error:', error);
              return new Response(JSON.stringify({ message: 'Error al guardar la suscripción.' }), { status: 500 });
          }
        }

        const msg = existing
          ? '¡Bienvenido de nuevo! Tu suscripción ha sido reactivada. Revisa tu email.'
          : '¡Gracias por suscribirte! Revisa tu email para el código de descuento.';

        console.log('[Newsletter] Successfully subscribed/reactivated:', email);
        return new Response(JSON.stringify({ message: msg }), { status: 200 });

    } catch (e: any) {
        console.error('[Newsletter] Exception:', e.message);
        return new Response(JSON.stringify({ message: 'Error de servidor: ' + (e.message || 'Unknown error') }), { status: 500 });
    }
};

