import type { APIRoute } from 'astro';
import { createServerSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { password } = await request.json();
        if (!password) {
            return new Response(JSON.stringify({ error: 'Contraseña requerida.' }), { status: 400 });
        }

        const supabase = await createServerSupabaseClient({ cookies });
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: 'No autenticado.' }), { status: 401 });
        }

        // Verificar contraseña actual
        const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: user.email!,
            password,
        });

        if (signInErr) {
            return new Response(JSON.stringify({ error: 'Contraseña incorrecta.' }), { status: 403 });
        }

        // Eliminar usuario con cliente admin (service role)
        const adminClient = getAdminSupabaseClient();
        if (!adminClient) {
            return new Response(JSON.stringify({ error: 'Error de configuración del servidor.' }), { status: 500 });
        }

        const { error: deleteErr } = await (adminClient as any).auth.admin.deleteUser(user.id);

        if (deleteErr) {
            console.error('[Delete Account]', deleteErr);
            return new Response(JSON.stringify({ error: 'Error al eliminar la cuenta. Inténtalo de nuevo.' }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        console.error('[Delete Account API]', err);
        return new Response(JSON.stringify({ error: 'Error interno del servidor.' }), { status: 500 });
    }
};
