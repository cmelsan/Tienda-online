import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
    try {
        // Get token from cookies
        const accessTokenCookie = cookies.get('sb-admin-access-token');
        const accessToken = accessTokenCookie?.value;

        if (!accessToken) {
            return new Response(JSON.stringify({ 
                authenticated: false,
                token: null 
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify token with Supabase
        const supabase = await createServerSupabaseClient({
            cookies: {
                get: (name: string) => {
                    if (name === 'sb-admin-access-token') {
                        return { value: accessToken };
                    }
                    return undefined;
                }
            }
        }, true);

        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            return new Response(JSON.stringify({ 
                authenticated: false,
                token: null 
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Token is valid, return it
        return new Response(JSON.stringify({ 
            authenticated: true,
            token: accessToken,
            user: {
                id: user.id,
                email: user.email,
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[Session API] Error:', error);
        return new Response(JSON.stringify({ 
            authenticated: false,
            token: null,
            error: 'Internal server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
