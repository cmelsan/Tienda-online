import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ cookies }) => {
    // Clear ALL session cookies (both user and admin)
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    cookies.delete("sb-admin-access-token", { path: "/" });
    cookies.delete("sb-admin-refresh-token", { path: "/" });
    
    console.log('[Complete Logout] All sessions cleared');
    
    return new Response(JSON.stringify({ success: true }), {
        status: 200,
    });
};
