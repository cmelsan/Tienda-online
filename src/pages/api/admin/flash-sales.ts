import type { APIRoute } from 'astro';
import { createServerSupabaseClient, createTokenClient } from '@/lib/supabase';

export const POST: APIRoute = async (context) => {
  try {
    // Check authentication via cookies
    const userClient = await createServerSupabaseClient(context, true);
    const { data: { session }, error: sessionError } = await userClient.auth.getSession();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check is_admin
    const { data: profile } = await userClient.from('profiles').select('is_admin').eq('id', session.user.id).single();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await context.request.json();
    const { productId, data: updateData } = body;

    if (!productId || !updateData) {
      return new Response(
        JSON.stringify({ error: 'Missing productId or data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const dbClient = createTokenClient(session.access_token);

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
    console.error('[Flash Sales POST] Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async (context) => {
  try {
    // Check authentication via cookies
    const userClient = await createServerSupabaseClient(context, true);
    const { data: { session }, error: sessionError } = await userClient.auth.getSession();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check is_admin
    const { data: profile } = await userClient.from('profiles').select('is_admin').eq('id', session.user.id).single();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const dbClient = createTokenClient(session.access_token);

    const { data, error } = await dbClient
      .from('products')
      .select('id, name, slug, price, is_flash_sale, flash_sale_discount, flash_sale_end_time')
      .order('name');

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Flash Sales GET] Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
