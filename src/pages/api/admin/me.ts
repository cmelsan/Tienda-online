import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

export const GET: APIRoute = async (context) => {
    try {
        const supabase = await createServerSupabaseClient(context, true);
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            return new Response(JSON.stringify({ token: null, error: 'No session found' }), {
                status: 401,
            });
        }

        return new Response(JSON.stringify({ 
            token: session.access_token,
            user: session.user,
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (err) {
        console.error('[Admin ME API] Error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
        });
    }
};
