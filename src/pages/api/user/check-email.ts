import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ url }) => {
    const email = url.searchParams.get('email');

    if (!email || !email.includes('@')) {
        return new Response(JSON.stringify({ exists: false }), { status: 200 });
    }

    try {
        const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        return new Response(JSON.stringify({ exists: !!data }), { status: 200 });
    } catch (err) {
        return new Response(JSON.stringify({ exists: false }), { status: 200 });
    }
};
