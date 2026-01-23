import { defineMiddleware } from 'astro/middleware';
import { createServerSupabaseClient } from './lib/supabase';

export const onRequest = defineMiddleware(async (context: any, next: any) => {
    const { url, redirect } = context;

    // Check if the route is an admin route
    if (url.pathname.startsWith('/admin')) {
        // Skip authentication check for login page
        if (url.pathname === '/admin/login') {
            return next();
        }

        // Create Supabase client
        const supabase = await createServerSupabaseClient(context);

        // Get session
        const { data: { session } } = await supabase.auth.getSession();

        // Redirect to login if not authenticated
        if (!session) {
            return redirect('/admin/login');
        }

        // Check for admin role in profiles table
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('Error querying profiles:', error);
            return redirect('/admin/login?error=database');
        }

        if (!profile || !profile.is_admin) {
            console.log('User is not admin, redirecting to home');
            return redirect('/');
        }
    }

    // Check if the route is a customer protected route
    if (url.pathname.startsWith('/mi-cuenta')) {
        const supabase = await createServerSupabaseClient(context);
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return redirect('/login');
        }
    }

    return next();
});
