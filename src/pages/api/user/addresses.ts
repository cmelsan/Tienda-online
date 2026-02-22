import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET — fetch saved shipping addresses
export const GET: APIRoute = async (context) => {
    const supabase = await createServerSupabaseClient(context);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    try {
        const { data, error } = await supabase
            .from('user_addresses')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('address_type', 'shipping')
            .order('is_default', { ascending: false });

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        return new Response(JSON.stringify({ addresses: data ?? [] }), { status: 200 });
    } catch (err) {
        console.error('[addresses GET] Error:', err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};

// POST — save a new shipping address
export const POST: APIRoute = async (context) => {
    const supabase = await createServerSupabaseClient(context);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    try {
        const { addressData } = await context.request.json();

        if (!addressData) {
            return new Response(JSON.stringify({ error: 'Datos de dirección requeridos' }), { status: 400 });
        }

        // Check if this is the user's first address (make it default automatically)
        const { count } = await supabase
            .from('user_addresses')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('address_type', 'shipping');

        const isFirst = (count ?? 0) === 0;

        const { error } = await supabase.from('user_addresses').insert({
            user_id: session.user.id,
            address_data: addressData,
            address_type: 'shipping',
            is_default: isFirst,
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
