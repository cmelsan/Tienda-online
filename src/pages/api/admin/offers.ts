import type { APIRoute } from 'astro';
import { createServerSupabaseClient, createTokenClient } from '@/lib/supabase';

export const GET: APIRoute = async (context) => {
  try {
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
      throw offersError;
    }

    const featuredOffers = offersData?.value || [];

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

    const { featuredOffers } = await context.request.json();

    if (!Array.isArray(featuredOffers)) {
      return new Response(
        JSON.stringify({ error: 'featuredOffers must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const dbClient = createTokenClient(session.access_token);

    // Validate format - must have id and discount
    const formattedOffers = featuredOffers
      .filter((offer: any) => offer.id && typeof offer.id === 'string' && offer.id.trim())
      .map((offer: any) => ({
        id: offer.id,
        discount: Math.max(0, Math.min(100, offer.discount || 0))
      }));

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