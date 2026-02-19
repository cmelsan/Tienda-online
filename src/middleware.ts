import type { MiddlewareHandler } from 'astro';
import { createServerSupabaseClient } from './lib/supabase';

const DEBUG = import.meta.env.DEV;

export const onRequest: MiddlewareHandler = async (context, next) => {
    const { url, redirect } = context;

    // Protect /api/admin/* — same admin check as page routes
    if (url.pathname.startsWith('/api/admin')) {
        try {
            const supabase = await createServerSupabaseClient(context, true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', session.user.id)
                .single();

            if (!profile?.is_admin) {
                return new Response(JSON.stringify({ success: false, message: 'Admin access required' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (error) {
            console.error('[Middleware] Error checking /api/admin auth:', error);
            return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // Check if the route is an admin route
    if (url.pathname.startsWith('/admin')) {
        // Allow login page without authentication
        if (url.pathname === '/admin/login') {
            if (DEBUG) {
                console.log('[Middleware] Allowing access to /admin/login (no auth required)');
            }
            return next();
        }

        try {
            // Create Supabase client with admin flag
            const supabase = await createServerSupabaseClient(context, true);

            // Get session
            const { data: { session } } = await supabase.auth.getSession();

            // Redirect to login if not authenticated
            if (!session) {
                if (DEBUG) {
                    console.log('[Middleware] No admin session found, redirecting to /admin/login');
                }
                return redirect('/admin/login');
            }

            // Check for admin role in profiles table
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', session.user.id)
                .single();

            // If not admin, redirect to home
            if (!profile?.is_admin) {
                if (DEBUG) {
                    console.log('[Middleware] User is not admin, denying access');
                }
                return redirect('/');
            }
            
            if (DEBUG) {
                console.log('[Middleware] Admin access granted');
            }
        } catch (error) {
            console.error('[Middleware] Error checking admin access:', error);
            return redirect('/admin/login');
        }
    }

    // Check if the route is a customer protected route
    if (url.pathname.startsWith('/mi-cuenta')) {
        try {
            if (DEBUG) {
                const accessTokenCookie = context.cookies.get('sb-access-token');
                console.log('[Middleware] /mi-cuenta - Checking auth');
                console.log('[Middleware] Access token cookie:', accessTokenCookie?.value ? 'EXISTS' : 'MISSING');
            }
            
            const supabase = await createServerSupabaseClient(context);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                if (DEBUG) {
                    console.log('[Middleware] No session found, redirecting to /login');
                }
                return redirect('/login');
            }
            
            if (DEBUG) {
                console.log('[Middleware] Session validated for /mi-cuenta');
            }
        } catch (error) {
            console.error('[Middleware] Error checking /mi-cuenta:', error);
            return redirect('/login');
        }
    }

    return next();
};
