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

        // 1. Save to newsletter subscribers
        const { error } = await supabase
            .from('newsletter_subscribers')
            .insert({ email });

        if (error) {
            if (error.code === '23505') { // Unique violation
                return new Response(JSON.stringify({ message: 'Este email ya está suscrito.' }), { status: 409 });
            }
            return new Response(JSON.stringify({ message: 'Error al guardar.' }), { status: 500 });
        }

        // 2. Send welcome email with discount code
        try {
            const htmlContent = getNewsletterWelcomeTemplate(email, 'BIENVENIDO20', 20);
            
            const result = await sendEmail({
                to: email,
                subject: '🎉 ¡Bienvenido a la Newsletter ÉCLAT Beauty! Tu código de descuento está aquí',
                htmlContent
            });
            
            if (!result.success) {
                console.warn('Newsletter welcome email failed:', result.error);
                // Don't block newsletter signup if email fails
            }
        } catch (emailError) {
            console.warn('Newsletter welcome email error (non-blocking):', emailError);
        }

        return new Response(JSON.stringify({ message: '¡Gracias por suscribirte!' }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ message: 'Error de servidor' }), { status: 500 });
    }
};
