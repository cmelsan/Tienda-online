import type { APIRoute } from 'astro';
import { createServerSupabaseClient, createTokenClient, supabase } from '@/lib/supabase';

export const POST: APIRoute = async (context) => {
  const { request } = context;
  try {
    const serverSupabase = await createServerSupabaseClient(context);
    const { data: { session } } = await serverSupabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { product_id, rating, comment } = body;

    if (!product_id || !rating) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: 'Rating must be between 1 and 5' }),
        { status: 400 }
      );
    }

    const client = createTokenClient(session.access_token);

    // Verify user has purchased this product
    const reviewableStatuses = [
      'paid', 'shipped', 'delivered',
      'return_requested', 'returned', 'partially_returned',
      'refunded', 'partially_refunded',
    ];

    const { data: purchases } = await client
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .in('status', reviewableStatuses);

    if (!purchases || purchases.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Solo puedes opinar sobre productos que hayas comprado' }),
        { status: 403 }
      );
    }

    const { data: orderItems } = await client
      .from('order_items')
      .select('order_id')
      .eq('product_id', product_id)
      .in('order_id', purchases.map((o: any) => o.id))
      .limit(1);

    if (!orderItems || orderItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Solo puedes opinar sobre productos que hayas comprado' }),
        { status: 403 }
      );
    }

    // Check for duplicate review
    const { data: existing } = await client
      .from('reviews')
      .select('id')
      .eq('product_id', product_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Ya has opinado sobre este producto' }),
        { status: 409 }
      );
    }

    // Insert review (RLS: authenticated users can insert their own reviews)
    const { data: newReview, error: insertError } = await client
      .from('reviews')
      .insert({
        product_id,
        user_id: user.id,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Reviews POST] Insert error:', insertError.message);
      return new Response(
        JSON.stringify({ error: 'Error al guardar la opinión: ' + insertError.message }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify(newReview), { status: 201 });
  } catch (error: any) {
    console.error('Error creating review:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const productId = url.searchParams.get('productId');

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Missing productId' }),
        { status: 400 }
      );
    }

    // Reviews are public — anon client is fine here (reviews_are_public RLS policy)
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify(reviews), { status: 200 });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
