import type { APIRoute } from 'astro';
import { createTokenClient } from '@/lib/supabase';

function decodeJWTPayload(token: string): any {
    const part = token.split('.')[1];
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
}

function getAuthClient(context: any): { client: ReturnType<typeof createTokenClient> | null; userId: string | null } {
    const accessToken = context.cookies.get('sb-access-token')?.value;
    if (!accessToken) return { client: null, userId: null };
    try {
        const payload = decodeJWTPayload(accessToken);
        const userId: string = payload.sub;
        if (Math.floor(Date.now() / 1000) >= payload.exp) {
            return { client: null, userId: null };
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
