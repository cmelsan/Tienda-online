
import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

// Helper to slugify
const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

export const POST: APIRoute = async ({ request }) => {
    try {
        // Get auth token from headers or request body
        const authHeader = request.headers.get('Authorization');
        let token = authHeader?.replace('Bearer ', '');
        
        if (!token) {
            const body = await request.json();
            // If no token, return error - auth will be validated by client
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Set the token on the supabase client
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

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
            const { data: subcategory, error } = await supabase
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

            const { error } = await supabase
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
            const { data: brand, error } = await supabase
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

            const { error } = await supabase
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
