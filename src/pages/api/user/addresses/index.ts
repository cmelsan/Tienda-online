import type { APIRoute } from 'astro';
import { createTokenClient } from '@/lib/supabase';

async function getAuthClient(context: any) {
    const accessToken = context.cookies.get('sb-access-token')?.value;
    const refreshToken = context.cookies.get('sb-refresh-token')?.value;
    if (!accessToken) return { client: null, userId: null };
    try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const userId: string = payload.sub;
        if (Date.now() / 1000 > payload.exp) {
            if (!refreshToken) return { client: null, userId: null };
            const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
            const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
            if (!res.ok) return { client: null, userId: null };
            const { access_token: newToken, refresh_token: newRefresh } = await res.json();
            const isSecure = (import.meta.env.PUBLIC_SITE_URL || '').startsWith('https');
            const maxAge = 60 * 60 * 24 * 7;
            context.cookies.set('sb-access-token', newToken, { path: '/', maxAge, httpOnly: true, sameSite: isSecure ? 'none' : 'lax', secure: isSecure });
            context.cookies.set('sb-refresh-token', newRefresh, { path: '/', maxAge, httpOnly: true, sameSite: isSecure ? 'none' : 'lax', secure: isSecure });
            const newPayload = JSON.parse(atob(newToken.split('.')[1]));
            return { client: createTokenClient(newToken), userId: newPayload.sub };
        }
        return { client: createTokenClient(accessToken), userId };
    } catch {
        return { client: null, userId: null };
    }
}

// GET — fetch saved addresses (all types or filtered by ?type=shipping|billing)
export const GET: APIRoute = async (context) => {
    const { client, userId } = await getAuthClient(context);

    if (!client || !userId) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    try {
        const type = context.url.searchParams.get('type');

        let query = client
            .from('user_addresses')
            .select('*')
            .eq('user_id', userId)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

        if (type) {
            query = query.eq('address_type', type);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[addresses GET] Supabase error:', error);
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
    const { client, userId } = await getAuthClient(context);

    if (!client || !userId) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    try {
        const { addressData, address_type = 'shipping', is_default } = await context.request.json();

        if (!addressData) {
            return new Response(JSON.stringify({ error: 'Datos de dirección requeridos' }), { status: 400 });
        }

        let makeDefault = is_default ?? false;
        if (!makeDefault) {
            const { count } = await client
                .from('user_addresses')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('address_type', address_type);
            makeDefault = (count ?? 0) === 0;
        }

        if (makeDefault) {
            await client.from('user_addresses').update({ is_default: false })
                .eq('user_id', userId).eq('address_type', address_type);
        }

        const { error } = await client.from('user_addresses').insert({
            user_id: userId,
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
