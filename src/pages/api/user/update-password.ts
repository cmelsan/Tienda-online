import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async (context) => {
    const supabase = await createServerSupabaseClient(context);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    try {
        const { currentPassword, newPassword } = await context.request.json();

        if (!currentPassword || !newPassword) {
            return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), { status: 400 });
        }
        if (newPassword.length < 8) {
            return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }), { status: 400 });
        }

        // Verify current password
        const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: session.user.email!,
            password: currentPassword,
        });

        if (signInErr) {
            return new Response(JSON.stringify({ error: 'La contraseña actual es incorrecta.' }), { status: 400 });
        }

        // Update to new password
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        console.error('[update-password] Error:', err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};
