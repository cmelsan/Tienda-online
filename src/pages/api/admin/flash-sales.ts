import type { APIRoute } from 'astro';
import { getAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async (context) => {
  try {
    console.log('[Flash Sales POST] Starting...');
    
    // Check authentication via cookies
    const userClient = await createServerSupabaseClient(context, true);
    const { data: { session }, error: sessionError } = await userClient.auth.getSession();
    
    if (sessionError || !session) {
      console.error('[Flash Sales POST] No session found:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await context.request.json();
    const { productId, data: updateData } = body;

    if (!productId || !updateData) {
      return new Response(
        JSON.stringify({ error: 'Missing productId or data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Try admin client first, fallback to user client
    const adminClient = getAdminSupabaseClient();
    const dbClient = adminClient || userClient;

    console.log('[Flash Sales POST] Using', adminClient ? 'admin' : 'user', 'client');

    const { error } = await dbClient
      .from('products')
      .update(updateData)
      .eq('id', productId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Flash Sales POST] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async (context) => {
  try {
    console.log('[Flash Sales GET] Starting...');
    
    // Check authentication via cookies
    const userClient = await createServerSupabaseClient(context, true);
    const { data: { session }, error: sessionError } = await userClient.auth.getSession();
    
    if (sessionError || !session) {
      console.error('[Flash Sales GET] No session found:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Try admin client first, fallback to user client
    const adminClient = getAdminSupabaseClient();
    const dbClient = adminClient || userClient;

    console.log('[Flash Sales GET] Using', adminClient ? 'admin' : 'user', 'client');

    const { data, error } = await dbClient
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
