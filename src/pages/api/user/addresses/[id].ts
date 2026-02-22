import type { APIRoute } from 'astro';
import { createServerSupabaseClient, createTokenClient } from '@/lib/supabase';

// PUT — update an address by id
export const PUT: APIRoute = async (context) => {
    const supabase = await createServerSupabaseClient(context);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    const client = createTokenClient(session.access_token);
    const { id } = context.params;

    try {
        const { address_data, address_type, is_default } = await context.request.json();

        // If setting as default, unset others of same type first
        if (is_default) {
            await client
                .from('user_addresses')
                .update({ is_default: false })
                .eq('user_id', session.user.id)
                .eq('address_type', address_type)
                .neq('id', id);
        }

        const { error } = await client
            .from('user_addresses')
            .update({ address_data, address_type, is_default, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        console.error('[addresses PUT] Error:', err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};

// DELETE — remove an address by id
export const DELETE: APIRoute = async (context) => {
    const supabase = await createServerSupabaseClient(context);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    const client = createTokenClient(session.access_token);
    const { id } = context.params;

    try {
        const { error } = await client
            .from('user_addresses')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        console.error('[addresses DELETE] Error:', err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};

// PATCH — set address as default
export const PATCH: APIRoute = async (context) => {
    const supabase = await createServerSupabaseClient(context);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    const client = createTokenClient(session.access_token);
    const { id } = context.params;

    try {
        const { data: addr, error: fetchErr } = await client
            .from('user_addresses')
            .select('address_type')
            .eq('id', id)
            .eq('user_id', session.user.id)
            .single();

        if (fetchErr || !addr) {
            return new Response(JSON.stringify({ error: 'Dirección no encontrada' }), { status: 404 });
        }

        await client
            .from('user_addresses')
            .update({ is_default: false })
            .eq('user_id', session.user.id)
            .eq('address_type', addr.address_type);

        const { error } = await client
            .from('user_addresses')
            .update({ is_default: true })
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        console.error('[addresses PATCH] Error:', err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};
