import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { sendEmail, getNewsletterWelcomeTemplate } from '@/lib/brevo';

export const POST: APIRoute = async ({ request }) => {
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

        // 2. Send welcome email FIRST (before saving to DB)
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

        // 3. Save to newsletter subscribers (AFTER successful email send)
        const { error } = await supabase
            .from('newsletter_subscribers')
            .insert({ email });

        if (error) {
            if (error.code === '23505') { // Unique violation
                console.log('[Newsletter] Email already subscribed:', email);
                return new Response(JSON.stringify({ message: 'Este email ya está suscrito.' }), { status: 409 });
            }
            console.error('[Newsletter] Database error:', error);
            return new Response(JSON.stringify({ message: 'Error al guardar la suscripción.' }), { status: 500 });
        }

        console.log('[Newsletter] Successfully subscribed:', email);
        return new Response(JSON.stringify({ message: '¡Gracias por suscribirte! Revisa tu email para el código de descuento.' }), { status: 200 });

    } catch (e: any) {
        console.error('[Newsletter] Exception:', e.message);
        return new Response(JSON.stringify({ message: 'Error de servidor: ' + (e.message || 'Unknown error') }), { status: 500 });
    }
};

