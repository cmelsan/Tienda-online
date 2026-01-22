import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const { email } = data;

        if (!email || !email.includes('@')) {
            return new Response(JSON.stringify({ message: 'Email inválido' }), { status: 400 });
        }

        const { error } = await supabase
            .from('newsletter_subscribers')
            .insert({ email });

        if (error) {
            if (error.code === '23505') { // Unique violation
                return new Response(JSON.stringify({ message: 'Este email ya está suscrito.' }), { status: 409 });
            }
            return new Response(JSON.stringify({ message: 'Error al guardar.' }), { status: 500 });
        }

        return new Response(JSON.stringify({ message: '¡Gracias por suscribirte!' }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ message: 'Error de servidor' }), { status: 500 });
    }
};
