import type { APIRoute } from 'astro';
import { getAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase';

export const GET: APIRoute = async (context) => {
  try {
    console.log('[Offers API GET] Starting...');

    // Check authentication
    const userClient = await createServerSupabaseClient(context, true);
    const { data: { session }, error: sessionError } = await userClient.auth.getSession();

    if (sessionError || !session) {
      console.error('[Offers API GET] No session found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Try admin client first, fallback to user client
    const adminClient = getAdminSupabaseClient();
    const dbClient = adminClient || userClient;

    console.log('[Offers API GET] Using', adminClient ? 'admin' : 'user', 'client');

    // Fetch all products
    const { data: products, error: productsError } = await dbClient
      .from('products')
      .select('id, name, slug, price, images, brand:brands(name)')
      .order('name');

    if (productsError) throw productsError;

    // Fetch featured offers setting
    const { data: offersData, error: offersError } = await dbClient
      .from('app_settings')
      .select('value')
      .eq('key', 'featured_offers')
      .single();

    if (offersError && offersError.code !== 'PGRST116') {
      // PGRST116 = not found, which is OK
      throw offersError;
    }

    const featuredOffers = offersData?.value || [];

    console.log('[Offers API GET] Products:', products?.length, 'Featured:', featuredOffers.length);

    return new Response(
      JSON.stringify({
        success: true,
        products: products || [],
        featuredOffers: featuredOffers,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Offers API GET] Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async (context) => {
  try {
    console.log('[Offers API POST] Starting...');

    // Check authentication
    const userClient = await createServerSupabaseClient(context, true);
    const { data: { session }, error: sessionError } = await userClient.auth.getSession();

    if (sessionError || !session) {
      console.error('[Offers API POST] No session found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { featuredOffers } = await context.request.json();

    if (!Array.isArray(featuredOffers)) {
      return new Response(
        JSON.stringify({ error: 'featuredOffers must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Try admin client first, fallback to user client
    const adminClient = getAdminSupabaseClient();
    const dbClient = adminClient || userClient;

    // Validate format - must have id and discount
    const formattedOffers = featuredOffers.map((offer: any) => ({
      id: offer.id,
      discount: Math.max(0, Math.min(100, offer.discount || 0)) // Clamp between 0-100
    }));

    console.log('[Offers API POST] Saving featured offers:', formattedOffers);

    // Upsert setting
    const { data, error } = await dbClient
      .from('app_settings')
      .upsert(
        {
          key: 'featured_offers',
          value: formattedOffers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select()
      .single();

    if (error) {
      console.error('[Offers API POST] Upsert error:', error);
      throw error;
    }

    console.log('[Offers API POST] Setting saved successfully');

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Offers API POST] Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
