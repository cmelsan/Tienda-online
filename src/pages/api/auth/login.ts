import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect: astroRedirect }) => {
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
            // Set cookies on the server side
            // Note: httpOnly false allows client to read (needed for Supabase client)
            // but cookies must be set from server response for SSR to see them
            cookies.set('sb-access-token', data.session.access_token, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                sameSite: 'lax',
                httpOnly: false,
                secure: false, // Set to true in production with HTTPS
            });

            cookies.set('sb-refresh-token', data.session.refresh_token, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7,
                sameSite: 'lax',
                httpOnly: false,
                secure: false,
            });

            // Return the session info for cart migration on the client
            // Client will handle the actual redirect after migration
            return new Response(JSON.stringify({ 
                success: true, 
                user: data.user,
                sessionToken: data.session.access_token // Send token for reference
            }), {
                status: 200,
            });
        }

        return new Response(JSON.stringify({ error: 'No session created' }), {
            status: 401,
        });
    } catch (err) {
        console.error('[Login API] Error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
        });
    }
};
