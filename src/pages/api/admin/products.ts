import type { APIRoute } from 'astro';
import { slugify } from '@/lib/utils';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get all cookies to find the session token
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Parse session from cookies - Supabase stores it as sb-[project-id]-auth-token
    const sessionMatch = cookieHeader.match(/sb-\w+-auth-token=([^;]+)/);
    const sessionToken = sessionMatch?.[1];

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'No autenticado. Por favor inicia sesión.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAuth = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuario no válido' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAuth
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para crear productos' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    const {
      name,
      description,
      price,
      stock,
      category_id,
      subcategory_id,
      brand_id,
      images,
    } = data;

    if (!name || !description || !category_id) {
      return new Response(
        JSON.stringify({ error: 'Por favor completa todos los campos requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const slug = slugify(name);
    const priceInCents = Math.round(price * 100);

    const { data: product, error } = await supabaseAuth
      .from('products')
      .insert([
        {
          name,
          slug,
          description,
          price: priceInCents,
          stock,
          category_id,
          subcategory_id: subcategory_id || null,
          brand_id: brand_id || null,
          images: images || [],
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({ error: `Error: ${error.message}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, product }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Product creation error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor: ' + (error instanceof Error ? error.message : 'Unknown error') }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
