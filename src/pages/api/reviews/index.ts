import type { APIRoute } from 'astro';
import { supabase, getAdminSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify auth via anon client (validates JWT without needing session cookie)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
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

    // Use admin client — anon client has auth.uid()=null in server routes
    // (no cookie session), so RLS would block the INSERT.
    const adminClient = getAdminSupabaseClient() || supabase;
    const { data: review, error: insertError } = await adminClient
      .from('reviews')
      .insert([{
        product_id,
        user_id: user.id,
        rating,
        comment: comment?.trim() || null,
      }])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Ya has dejado una opinión para este producto' }),
          { status: 409 }
        );
      }
      throw insertError;
    }

    return new Response(JSON.stringify(review), { status: 201 });
  } catch (error) {
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
