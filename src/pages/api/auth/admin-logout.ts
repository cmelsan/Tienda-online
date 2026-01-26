import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
    try {
        // Clear admin cookies
        cookies.delete('sb-admin-access-token');
        cookies.delete('sb-admin-refresh-token');

        console.log('[Admin Logout] Admin session cleared');

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
        });
    } catch (err) {
        console.error('[Admin Logout] Error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
        });
    }
};
