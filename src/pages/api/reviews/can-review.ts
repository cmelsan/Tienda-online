import type { APIRoute } from 'astro';
import { createServerSupabaseClient, createTokenClient } from '@/lib/supabase';

export const GET: APIRoute = async (context) => {
  const { url } = context;
  try {
    const serverSupabase = await createServerSupabaseClient(context);
    const { data: { session } } = await serverSupabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      return new Response(JSON.stringify({ canReview: false }), { status: 200 });
    }

    const productId = url.searchParams.get('productId');
    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Missing productId' }),
        { status: 400 }
      );
    }

    // Use token client — RLS policies allow users to read their own orders
    const adminClient = createTokenClient(session.access_token);

    // Valid post-payment statuses in this system (no 'completed' status exists)
    const reviewableStatuses = [
      'paid', 'shipped', 'delivered',
      'return_requested', 'returned', 'partially_returned',
      'refunded', 'partially_refunded',
    ];

    // Check if user has purchased this product (RLS: users see only their own orders)
    const { data: purchases, error } = await adminClient
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .in('status', reviewableStatuses);

    if (error || !purchases || purchases.length === 0) {
      return new Response(JSON.stringify({ canReview: false }), { status: 200 });
    }

    // Check if product is in any of those orders
    const { data: orderItems, error: itemsError } = await adminClient
      .from('order_items')
      .select('order_id')
      .eq('product_id', productId)
      .in('order_id', purchases.map((o: any) => o.id))
      .limit(1);

    if (itemsError || !orderItems || orderItems.length === 0) {
      return new Response(JSON.stringify({ canReview: false }), { status: 200 });
    }

    // Check if user already reviewed this product
    const { data: existingReview } = await adminClient
      .from('reviews')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingReview) {
      return new Response(JSON.stringify({ canReview: false, alreadyReviewed: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ canReview: true }), { status: 200 });
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    return new Response(
      JSON.stringify({ canReview: false }),
      { status: 200 }
    );
  }
};
