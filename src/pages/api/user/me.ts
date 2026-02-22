import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

export const GET: APIRoute = async (context) => {
    const supabase = await createServerSupabaseClient(context);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return new Response(JSON.stringify({ user: null }), { status: 200 });
    }

    return new Response(JSON.stringify({
        user: {
            id: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata,
        }
    }), { status: 200 });
};
