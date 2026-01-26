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
            const isProduction = import.meta.env.PROD || process.env.NODE_ENV === 'production';
            const isHttps = import.meta.env.PUBLIC_SITE_URL?.startsWith('https');
            
            const cookieOptions = {
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                sameSite: 'lax' as const,
                httpOnly: false,
                secure: isProduction || isHttps ? true : false, // Use secure in production/HTTPS
            };
            
            console.log('[Login] Setting cookies with secure:', cookieOptions.secure, 'isProduction:', isProduction, 'isHttps:', isHttps);
            
            cookies.set('sb-access-token', data.session.access_token, cookieOptions);
            cookies.set('sb-refresh-token', data.session.refresh_token, cookieOptions);

            // Return the session info for cart migration on the client
            return new Response(JSON.stringify({ 
                success: true, 
                user: data.user,
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
