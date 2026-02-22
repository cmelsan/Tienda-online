import type { APIRoute } from 'astro';
import { createTokenClient } from '@/lib/supabase';

// Helper: get authenticated client directly from cookie token
async function getAuthClient(context: any) {
    const accessToken = context.cookies.get('sb-access-token')?.value;
    const refreshToken = context.cookies.get('sb-refresh-token')?.value;

    if (!accessToken) return { client: null, userId: null };

    // Decode JWT payload to get user id (no verification needed, server trusts Supabase tokens)
    try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const userId: string = payload.sub;
        const exp: number = payload.exp;

        // If expired, try to refresh
        if (Date.now() / 1000 > exp) {
            if (!refreshToken) return { client: null, userId: null };
            // Use refresh token to get new access token via Supabase Auth REST
            const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
            const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
            if (!res.ok) return { client: null, userId: null };
            const { access_token: newToken, refresh_token: newRefresh } = await res.json();
            // Update cookies
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

// PUT — update an address by id
export const PUT: APIRoute = async (context) => {
    const { client, userId } = await getAuthClient(context);

    if (!client || !userId) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    const { id } = context.params;

    try {
        const { address_data, address_type, is_default } = await context.request.json();

        if (is_default) {
            await client.from('user_addresses').update({ is_default: false })
                .eq('user_id', userId).eq('address_type', address_type).neq('id', id);
        }

        const { error } = await client.from('user_addresses')
            .update({ address_data, address_type, is_default, updated_at: new Date().toISOString() })
            .eq('id', id).eq('user_id', userId);

        if (error) {
            console.error('[addresses PUT] Supabase error:', error);
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
    const { client, userId } = await getAuthClient(context);

    if (!client || !userId) {
        console.error('[addresses DELETE] No auth — token missing or invalid');
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    const { id } = context.params;
    console.log('[addresses DELETE] userId:', userId, 'id:', id);

    try {
        const { error } = await client.from('user_addresses')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('[addresses DELETE] Supabase error:', JSON.stringify(error));
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        console.log('[addresses DELETE] Success');
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        console.error('[addresses DELETE] Exception:', err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};

// PATCH — set address as default
export const PATCH: APIRoute = async (context) => {
    const { client, userId } = await getAuthClient(context);

    if (!client || !userId) {
        return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    const { id } = context.params;

    try {
        const { data: addr, error: fetchErr } = await client.from('user_addresses')
            .select('address_type').eq('id', id).eq('user_id', userId).single();

        if (fetchErr || !addr) {
            return new Response(JSON.stringify({ error: 'Dirección no encontrada' }), { status: 404 });
        }

        await client.from('user_addresses').update({ is_default: false })
            .eq('user_id', userId).eq('address_type', addr.address_type);

        const { error } = await client.from('user_addresses')
            .update({ is_default: true }).eq('id', id).eq('user_id', userId);

        if (error) {
            console.error('[addresses PATCH] Supabase error:', error);
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        console.error('[addresses PATCH] Error:', err);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};
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
