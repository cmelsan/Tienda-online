import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ cookies }) => {
    // Use same options as login to properly clear the cookies
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
    const isSecure = siteUrl.startsWith('https');
    const cookieDeleteOptions = {
        path: '/',
        sameSite: isSecure ? 'none' as const : 'lax' as const,
        httpOnly: true,
        secure: isSecure,
    };
    cookies.delete('sb-access-token', cookieDeleteOptions);
    cookies.delete('sb-refresh-token', cookieDeleteOptions);
    
    console.log('[User Logout] User session cleared');
    
    return new Response(JSON.stringify({ success: true }), {
        status: 200,
    });
};
