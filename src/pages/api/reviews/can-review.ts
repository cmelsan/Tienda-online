import type { APIRoute } from 'astro';
import { supabase, getAdminSupabaseClient } from '@/lib/supabase';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ canReview: false }), { status: 200 });
    }

    const token = authHeader.slice(7);
    // Validate the user's token (anon client is fine for auth.getUser)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ canReview: false }), { status: 200 });
    }

    const productId = url.searchParams.get('productId');
    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Missing productId' }),
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS — anon client cannot read orders table
    // with server-to-server requests (no cookie session). Identity already
    // verified above via supabase.auth.getUser(token).
    const adminClient = getAdminSupabaseClient() || supabase;

    // Valid post-payment statuses in this system (no 'completed' status exists)
    const reviewableStatuses = [
      'paid', 'shipped', 'delivered',
      'return_requested', 'returned', 'partially_returned',
      'refunded', 'partially_refunded',
    ];

    // Check if user has purchased this product
    const { data: purchases, error } = await adminClient
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .in('status', reviewableStatuses)
      .limit(50);

    if (error) throw error;

    if (!purchases || purchases.length === 0) {
      return new Response(JSON.stringify({ canReview: false }), { status: 200 });
    }

    // Check if product is in any of those orders
    const { data: orderItems, error: itemsError } = await adminClient
      .from('order_items')
      .select('order_id')
      .eq('product_id', productId)
      .in('order_id', purchases.map(o => o.id))
      .limit(1);

    if (itemsError) throw itemsError;

    const canReview = orderItems && orderItems.length > 0;

    return new Response(JSON.stringify({ canReview }), { status: 200 });
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    return new Response(
      JSON.stringify({ canReview: false, error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
