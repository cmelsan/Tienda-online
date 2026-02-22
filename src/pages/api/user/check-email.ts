import type { APIRoute } from 'astro';
import { getAdminSupabaseClient, supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ url }) => {
    const email = url.searchParams.get('email');

    if (!email || !email.includes('@')) {
        return new Response(JSON.stringify({ exists: false }), { status: 200 });
    }

    try {
        // Use admin client to bypass any RLS on profiles
        const adminClient = getAdminSupabaseClient() || supabase;
        const { data } = await adminClient
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        return new Response(JSON.stringify({ exists: !!data }), { status: 200 });
    } catch (err) {
        console.error('[check-email] Error:', err);
        return new Response(JSON.stringify({ exists: false }), { status: 200 });
    }
};
