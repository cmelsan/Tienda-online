import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async (context) => {
    const supabase = await createServerSupabaseClient(context);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    try {
        const { name } = await context.request.json();
        if (!name?.trim()) {
            return new Response(JSON.stringify({ error: 'El nombre no puede estar vacío' }), { status: 400 });
        }

        const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        console.error('[update-name] Error:', err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};
