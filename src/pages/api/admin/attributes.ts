
import type { APIRoute } from 'astro';
import { supabase, getAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase';

// Helper to slugify
const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

export const POST: APIRoute = async (context) => {
    try {
        const { request } = context;
        
        // Create authenticated Supabase client with admin session
        const clientSupabase = await createServerSupabaseClient(context, true);

        // Get session to verify admin
        const { data: { session }, error: sessionError } = await clientSupabase.auth.getSession();

        if (sessionError || !session) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = session.user;

        // If user is authenticated with a valid token, they've already been verified as admin during login
        // No need to check is_admin again - the login endpoint already verified this

        // Get admin client (bypasses RLS) - may be null if SUPABASE_SERVICE_ROLE_KEY not set
        const adminClient = getAdminSupabaseClient();
        const dbClient = adminClient || supabase; // Fallback to regular supabase if admin client not available

        const body = await request.json();
        const { action } = body;

        if (!action) {
            return new Response(JSON.stringify({ error: 'Action is required' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 1. CREATE SUBCATEGORY
        if (action === 'create_subcategory') {
            const { name, category_id } = body;
            if (!name || !category_id) {
                return new Response(JSON.stringify({ error: 'Missing fields' }), { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const slug = slugify(name);
            const { data: subcategory, error } = await dbClient
                .from('subcategories')
                .insert({ name, slug, category_id })
                .select()
                .single();

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ success: true, subcategory }), { 
                status: 201,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 2. DELETE SUBCATEGORY
        if (action === 'delete_subcategory') {
            const { id } = body;
            if (!id) {
                return new Response(JSON.stringify({ error: 'Missing ID' }), { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const { error } = await dbClient
                .from('subcategories')
                .delete()
                .eq('id', id);

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ success: true }), { 
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 3. CREATE BRAND
        if (action === 'create_brand') {
            const { name } = body;
            if (!name) {
                return new Response(JSON.stringify({ error: 'Missing Name' }), { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const slug = slugify(name);
            const { data: brand, error } = await dbClient
                .from('brands')
                .insert({ name, slug })
                .select()
                .single();

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ success: true, brand }), { 
                status: 201,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 4. DELETE BRAND
        if (action === 'delete_brand') {
            const { id } = body;
            if (!id) {
                return new Response(JSON.stringify({ error: 'Missing ID' }), { 
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const { error } = await dbClient
                .from('brands')
                .delete()
                .eq('id', id);

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            return new Response(JSON.stringify({ success: true }), { 
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid Action' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
