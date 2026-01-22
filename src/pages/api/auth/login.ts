import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const { email, password } = await request.json();

        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 401,
            });
        }

        if (data.session) {
            // Set cookies on the server side - this is the key!
            cookies.set('sb-access-token', data.session.access_token, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                sameSite: 'lax',
                httpOnly: false, // Allow JavaScript to read (for Supabase client)
                secure: false, // Set to true in production with HTTPS
            });

            cookies.set('sb-refresh-token', data.session.refresh_token, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7,
                sameSite: 'lax',
                httpOnly: false,
                secure: false,
            });
        }

        return new Response(JSON.stringify({ success: true, user: data.user }), {
            status: 200,
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
        });
    }
};
