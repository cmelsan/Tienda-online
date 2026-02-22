import type { APIRoute } from 'astro';
import { createServerSupabaseClient, createTokenClient } from '@/lib/supabase';

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

        // Obtener sesión para token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return new Response(JSON.stringify({ error: 'Sesión expirada.' }), { status: 401 });
        }

        // Llamar RPC SECURITY DEFINER que elimina todos los datos del usuario
        // IMPORTANTE: ejecutar fix_delete_account.sql en Supabase si no lo has hecho
        const tokenClient = createTokenClient(session.access_token);
        const { data: result, error: rpcError } = await tokenClient.rpc('delete_my_account');

        if (rpcError) {
            console.error('[Delete Account] RPC error:', rpcError.message);
            return new Response(JSON.stringify({ error: 'Error al eliminar la cuenta. Inténtalo de nuevo.' }), { status: 500 });
        }

        if (result && result.success === false) {
            return new Response(JSON.stringify({ error: result.error || 'Error al eliminar la cuenta.' }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        console.error('[Delete Account API]', err);
        return new Response(JSON.stringify({ error: 'Error interno del servidor.' }), { status: 500 });
    }
};
