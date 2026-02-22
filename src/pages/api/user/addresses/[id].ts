import type { APIRoute } from 'astro';
import { createServerSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase';

// PUT — update an address by id
export const PUT: APIRoute = async (context) => {
    const supabase = await createServerSupabaseClient(context);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    const { id } = context.params;

    try {
        const { address_data, address_type, is_default } = await context.request.json();
        const adminClient = getAdminSupabaseClient()!;

        // Verify ownership
        const { data: existing } = await adminClient
            .from('user_addresses')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!existing || existing.user_id !== session.user.id) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
        }

        // If setting as default, unset others of same type
        if (is_default) {
            await adminClient
                .from('user_addresses')
                .update({ is_default: false })
                .eq('user_id', session.user.id)
                .eq('address_type', address_type)
                .neq('id', id);
        }

        const { error } = await adminClient
            .from('user_addresses')
            .update({ address_data, address_type, is_default, updated_at: new Date().toISOString() })
            .eq('id', id);

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

    const { id } = context.params;

    try {
        const adminClient = getAdminSupabaseClient()!;

        // Verify ownership
        const { data: existing } = await adminClient
            .from('user_addresses')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!existing || existing.user_id !== session.user.id) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
        }

        const { error } = await adminClient
            .from('user_addresses')
            .delete()
            .eq('id', id);

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

    const { id } = context.params;

    try {
        const adminClient = getAdminSupabaseClient()!;

        // Get the address to know its type and verify ownership
        const { data: addr } = await adminClient
            .from('user_addresses')
            .select('user_id, address_type')
            .eq('id', id)
            .single();

        if (!addr || addr.user_id !== session.user.id) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
        }

        // Unset all others of same type
        await adminClient
            .from('user_addresses')
            .update({ is_default: false })
            .eq('user_id', session.user.id)
            .eq('address_type', addr.address_type);

        // Set this one as default
        const { error } = await adminClient
            .from('user_addresses')
            .update({ is_default: true })
            .eq('id', id);

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        console.error('[addresses PATCH] Error:', err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};
