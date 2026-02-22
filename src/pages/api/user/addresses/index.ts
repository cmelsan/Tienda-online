import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET — fetch saved addresses (all types or filtered by ?type=shipping|billing)
export const GET: APIRoute = async (context) => {
    const supabase = await createServerSupabaseClient(context);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    try {
        const type = context.url.searchParams.get('type');

        // Use session-based client — auth.uid() is set, RLS allows reading own addresses
        let query = supabase
            .from('user_addresses')
            .select('*')
            .eq('user_id', session.user.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

        if (type) {
            query = query.eq('address_type', type);
        }

        const { data, error } = await query;

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        return new Response(JSON.stringify({ addresses: data ?? [] }), { status: 200 });
    } catch (err) {
        console.error('[addresses GET] Error:', err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};

// POST — save a new address
export const POST: APIRoute = async (context) => {
    const supabase = await createServerSupabaseClient(context);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    try {
        const { addressData, address_type = 'shipping', is_default } = await context.request.json();

        if (!addressData) {
            return new Response(JSON.stringify({ error: 'Datos de dirección requeridos' }), { status: 400 });
        }

        // Determine if this will be the default
        let makeDefault = is_default ?? false;
        if (!makeDefault) {
            const { count } = await supabase
                .from('user_addresses')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', session.user.id)
                .eq('address_type', address_type);

            makeDefault = (count ?? 0) === 0;
        }

        // If setting as default, unset others of same type
        if (makeDefault) {
            await supabase
                .from('user_addresses')
                .update({ is_default: false })
                .eq('user_id', session.user.id)
                .eq('address_type', address_type);
        }

        const { error } = await supabase.from('user_addresses').insert({
            user_id: session.user.id,
            address_data: addressData,
            address_type,
            is_default: makeDefault,
        });

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        console.error('[addresses POST] Error:', err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};
