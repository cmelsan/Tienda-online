import { defineMiddleware } from 'astro/middleware';
import { createServerSupabaseClient } from './lib/supabase';

export const onRequest = defineMiddleware(async (context: any, next: any) => {
    const { url, redirect } = context;

    // Check if the route is an admin route
    if (url.pathname.startsWith('/admin')) {
        // Allow login page without authentication
        if (url.pathname === '/admin/login') {
            console.log('[Middleware] Allowing access to /admin/login (no auth required)');
            return next();
        }

        try {
            // Create Supabase client with admin flag
            const supabase = await createServerSupabaseClient(context, true);

            // Get session
            const { data: { session } } = await supabase.auth.getSession();

            // Redirect to login if not authenticated
            if (!session) {
                console.log('[Middleware] No admin session found, redirecting to /admin/login');
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
                console.log('[Middleware] User is not admin, denying access to /admin:', session.user.id);
                return redirect('/');
            }
            
            console.log('[Middleware] Admin access granted for user:', session.user.id);
        } catch (error) {
            console.error('[Middleware] Error checking admin access:', error);
            return redirect('/admin/login');
        }
    }

    // Check if the route is a customer protected route
    if (url.pathname.startsWith('/mi-cuenta')) {
        try {
            // Debug: Log cookies
            const accessTokenCookie = context.cookies.get('sb-access-token');
            console.log('[Middleware] /mi-cuenta - Checking auth');
            console.log('[Middleware] Access token cookie:', accessTokenCookie?.value ? 'EXISTS' : 'MISSING');
            
            const supabase = await createServerSupabaseClient(context);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                console.log('[Middleware] No session found, redirecting to /login');
                return redirect('/login');
            }
            
            console.log('[Middleware] Session found for user:', session.user.id);
        } catch (error) {
            console.error('[Middleware] Error checking /mi-cuenta:', error);
            return redirect('/login');
        }
    }

    return next();
});
