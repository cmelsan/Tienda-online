import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';

  // Require at least 2 characters to search
  if (q.length < 2) {
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, images, price, brand:brands(name)')
    // ILIKE is case-insensitive: matches name OR brand name
    .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    .eq('active', true)
    .order('name', { ascending: true })
    .limit(6);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
    price: p.price,
    brand: (p.brand as { name: string } | null)?.name ?? null,
  }));

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
