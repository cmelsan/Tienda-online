import { defineMiddleware } from 'astro:middleware';
import { createServerSupabaseClient } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
    const { url, redirect, request } = context;

    // Check if the route is an admin route
    if (url.pathname.startsWith('/admin')) {
        // Skip authentication check for login page
        if (url.pathname === '/admin/login') {
            return next();
        }

        // Create Supabase client
        const supabase = createServerSupabaseClient(context);

        // Get session
        const { data: { session } } = await supabase.auth.getSession();

        // Redirect to login if not authenticated
        if (!session) {
            return redirect('/admin/login');
        }

        // Optional: Check for admin role
        // const userRole = session.user.user_metadata?.role;
        // if (userRole !== 'admin') {
        //   return redirect('/admin/login');
        // }
    }

    // Check if the route is a customer protected route
    if (url.pathname.startsWith('/mi-cuenta')) {
        const supabase = createServerSupabaseClient(context);
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return redirect('/login');
        }
    }

    return next();
});
