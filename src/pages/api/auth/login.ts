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
            const msg = error.message.includes('Invalid login credentials')
              ? 'Correo o contraseña incorrectos.'
              : error.message.includes('Email not confirmed')
              ? 'Debes confirmar tu correo electrónico antes de iniciar sesión.'
              : error.message.includes('Too many requests')
              ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
              : 'Error al iniciar sesión. Inténtalo de nuevo.';
            return new Response(JSON.stringify({ error: msg }), {
                status: 401,
            });
        }

        if (data.session && data.user) {
            // Verify that the user is NOT an admin (admin should use /api/auth/admin-login)
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.error('[User Login] Error checking profile:', profileError);
                return new Response(JSON.stringify({ error: 'Error al verificar perfil' }), {
                    status: 500,
                });
            }

            if (profile?.is_admin) {
                console.log('[User Login] Admin tried to use user login:', data.user.id);
                return new Response(JSON.stringify({ error: 'Los administradores deben usar el login de panel. Por favor ve a /admin/login' }), {
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
                httpOnly: true, // Prevent XSS access to session tokens
                secure: isSecure,
            };
            
            console.log('[User Login] Setting cookies - Site URL:', siteUrl, 'Secure:', isSecure);
            
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

        return new Response(JSON.stringify({ error: 'No se pudo crear la sesión. Inténtalo de nuevo.' }), {
            status: 401,
        });
    } catch (err) {
        console.error('[Login API] Error:', err);
        return new Response(JSON.stringify({ error: 'Error interno del servidor. Inténtalo más tarde.' }), {
            status: 500,
        });
    }
};
