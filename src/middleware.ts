import { defineMiddleware } from 'astro/middleware';
import { createServerSupabaseClient } from './lib/supabase';

export const onRequest = defineMiddleware(async (context: any, next: any) => {
    const { url, redirect } = context;

    // Check if the route is an admin route
    if (url.pathname.startsWith('/admin')) {
        // Allow login page without authentication
        if (url.pathname === '/admin/login') {
            return next();
        }

        try {
            // Create Supabase client
            const supabase = await createServerSupabaseClient(context);

            // Get session
            const { data: { session } } = await supabase.auth.getSession();

            // Redirect to login if not authenticated
            if (!session) {
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
                return redirect('/');
            }
        } catch (error) {
            console.error('Middleware error:', error);
            return redirect('/admin/login');
        }
    }

    // Check if the route is a customer protected route
    if (url.pathname.startsWith('/mi-cuenta')) {
        try {
            const supabase = await createServerSupabaseClient(context);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                return redirect('/login');
            }
        } catch (error) {
            console.error('Middleware error:', error);
            return redirect('/login');
        }
    }

    return next();
});
