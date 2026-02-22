import type { APIRoute } from 'astro';
import { createTokenClient } from '@/lib/supabase';

// Decode a base64url-encoded JWT payload (handles - + _ / and missing padding)
function decodeJWTPayload(token: string): any {
    const part = token.split('.')[1];
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
}

// Helper: read JWT from httpOnly cookie, decode it, return a token client
function getAuthClient(context: any): { client: ReturnType<typeof createTokenClient> | null; userId: string | null } {
    const accessToken = context.cookies.get('sb-access-token')?.value;
    if (!accessToken) return { client: null, userId: null };
    try {
        const payload = decodeJWTPayload(accessToken);
        const userId: string = payload.sub;
        // Check expiry
        if (Math.floor(Date.now() / 1000) >= payload.exp) {
            return { client: null, userId: null };
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
