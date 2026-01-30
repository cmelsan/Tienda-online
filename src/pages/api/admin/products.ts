import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';
import { slugify } from '@/lib/utils';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create authenticated Supabase client with admin session
    const supabase = await createServerSupabaseClient({ cookies }, true);

    // Verify session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'No autenticado. Por favor inicia sesión.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
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
    // Ensure price is in cents (integer) to avoid floating point precision issues
    const priceInCents = typeof price === 'string' ? Math.round(parseFloat(price) * 100) : Math.round(price * 100);

    const { data: product, error } = await supabase
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

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = await createServerSupabaseClient({ cookies }, true);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'No autenticado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const {
      id,
      name,
      description,
      price,
      stock,
      category_id,
      subcategory_id,
      brand_id,
      images,
      slug,
    } = await request.json();

    if (!id || !name || !description || !category_id) {
      return new Response(
        JSON.stringify({ error: 'Campos requeridos faltantes' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase
      .from('products')
      .update({
        name,
        slug,
        description,
        price,
        stock,
        category_id,
        subcategory_id,
        brand_id,
        images,
      })
      .eq('id', id);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Product update error:', error);
    return new Response(
      JSON.stringify({ error: 'Error al actualizar' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = await createServerSupabaseClient({ cookies }, true);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'No autenticado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await request.json();

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Product delete error:', error);
    return new Response(
      JSON.stringify({ error: 'Error al eliminar' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
