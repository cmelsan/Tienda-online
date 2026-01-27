import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/utils';

export const POST: APIRoute = async ({ request }) => {
  try {
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
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
