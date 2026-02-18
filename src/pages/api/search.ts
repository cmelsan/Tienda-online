import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';

  // Require at least 2 characters to search
  if (q.length < 2) {
    return new Response(JSON.stringify({ products: [], brands: [], categories: [], subcategories: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Buscar productos
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, slug, images, price, brand:brands(name)')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(4);

    // Buscar marcas
    const { data: brandsData } = await supabase
      .from('brands')
      .select('id, name, slug, logo_url')
      .ilike('name', `%${q}%`)
      .order('name', { ascending: true })
      .limit(3);

    // Buscar categorías
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('id, name, slug')
      .ilike('name', `%${q}%`)
      .order('name', { ascending: true })
      .limit(3);

    // Buscar subcategorías
    const { data: subcategoriesData } = await supabase
      .from('subcategories')
      .select('id, name, slug, category:categories(name)')
      .ilike('name', `%${q}%`)
      .order('name', { ascending: true })
      .limit(3);

    const products = (productsData ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
      price: p.price,
      brand: (p.brand as { name: string } | null)?.name ?? null,
    }));

    const brands = (brandsData ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logo: b.logo_url,
    }));

    const categories = (categoriesData ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    }));

    const subcategories = (subcategoriesData ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      category: (s.category as { name: string } | null)?.name ?? null,
    }));

    return new Response(
      JSON.stringify({ products, brands, categories, subcategories }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ products: [], brands: [], categories: [], subcategories: [], error: 'Search failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
