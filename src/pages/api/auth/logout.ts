import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ cookies }) => {
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
    const isSecure = siteUrl.startsWith('https');

    // Set cookies to empty with maxAge 0 — more reliable than cookies.delete()
    const expiredOptions = {
        path: '/',
        maxAge: 0,
        sameSite: isSecure ? 'none' as const : 'lax' as const,
        httpOnly: true,
        secure: isSecure,
    };
    cookies.set('sb-access-token', '', expiredOptions);
    cookies.set('sb-refresh-token', '', expiredOptions);

    console.log('[User Logout] User session cleared');

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
    });
};
