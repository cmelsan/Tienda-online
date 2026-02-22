import type { APIRoute } from "astro";

// GET: browser navigates directly here → clears cookies → redirects to /login
// This is the most reliable way: Set-Cookie is processed BEFORE the redirect is followed
export const GET: APIRoute = async ({ cookies, redirect }) => {
    clearUserCookies(cookies);
    console.log('[User Logout] User session cleared (GET)');
    return redirect('/login', 302);
};

// POST: kept for backwards compat (delete-account still calls it)
export const POST: APIRoute = async ({ cookies, redirect }) => {
    clearUserCookies(cookies);
    console.log('[User Logout] User session cleared (POST)');
    return redirect('/login', 302);
};

function clearUserCookies(cookies: any) {
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
    const isSecure = siteUrl.startsWith('https');

    const opts = {
        path: '/',
        maxAge: 0,
        expires: new Date(0), // explicitly expire in the past
        sameSite: isSecure ? 'none' as const : 'lax' as const,
        httpOnly: true,
        secure: isSecure,
    };
    cookies.set('sb-access-token', '', opts);
    cookies.set('sb-refresh-token', '', opts);
}
