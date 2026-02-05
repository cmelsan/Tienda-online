import type { APIRoute } from 'astro';
import { getAdminSupabaseClient } from '@/lib/supabase';

// Use admin client to bypass RLS
const adminClient = getAdminSupabaseClient();

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!adminClient) {
      return new Response(
        JSON.stringify({ error: 'Server not properly configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { productId, data: updateData } = body;

    if (!productId || !updateData) {
      return new Response(
        JSON.stringify({ error: 'Missing productId or data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await adminClient
      .from('products')
      .update(updateData)
      .eq('id', productId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Flash sales API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async ({ request }) => {
  try {
    console.log('[Flash Sales GET] Starting...');
    
    if (!adminClient) {
      console.error('[Flash Sales GET] Admin client not available');
      return new Response(
        JSON.stringify({ error: 'Server not properly configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await adminClient
      .from('products')
      .select('id, name, slug, price, is_flash_sale, flash_sale_discount, flash_sale_end_time')
      .order('name');

    console.log('[Flash Sales GET] Error:', error);
    console.log('[Flash Sales GET] Products count:', data?.length || 0);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Flash Sales GET] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
