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

        if (data.session && data.user) {
            // Verify that the user is an admin
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', data.user.id)
                .single();

            if (profileError || !profile?.is_admin) {
                console.log('[Admin Login] User is not an admin:', data.user.id);
                return new Response(JSON.stringify({ error: 'Acceso denegado. Usuario no es administrador.' }), {
                    status: 403,
                });
            }

            // Set cookies on the server side
            const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
            const isSecure = siteUrl.startsWith('https');
            
            const cookieOptions = {
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                sameSite: isSecure ? 'none' as const : 'lax' as const,
                httpOnly: false,
                secure: isSecure,
            };
            
            console.log('[Admin Login] Setting cookies - Site URL:', siteUrl, 'Secure:', isSecure, 'User:', data.user.id);
            
            cookies.set('sb-access-token', data.session.access_token, cookieOptions);
            cookies.set('sb-refresh-token', data.session.refresh_token, cookieOptions);

            // Return success response
            return new Response(JSON.stringify({ 
                success: true, 
                user: data.user,
                isAdmin: true,
            }), {
                status: 200,
            });
        }

        return new Response(JSON.stringify({ error: 'No session created' }), {
            status: 401,
        });
    } catch (err) {
        console.error('[Admin Login API] Error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
        });
    }
};
