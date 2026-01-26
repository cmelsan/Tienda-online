import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ cookies }) => {
    // Clear user cookies only
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    
    console.log('[User Logout] User session cleared');
    
    return new Response(JSON.stringify({ success: true }), {
        status: 200,
    });
};
