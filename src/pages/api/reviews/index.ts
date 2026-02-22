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

    // Use SECURITY DEFINER RPC — works regardless of RLS, validates purchase at DB level
    const adminClient = getAdminSupabaseClient() || supabase;
    const { data: rpcResult, error: rpcError } = await (adminClient as any).rpc(
      'insert_review_for_buyer',
      {
        p_product_id: product_id,
        p_user_id: user.id,
        p_rating: rating,
        p_comment: comment?.trim() || null,
      }
    );

    if (rpcError) {
      console.error('[Reviews POST] RPC error:', rpcError.message);
      return new Response(
        JSON.stringify({ error: 'Error al guardar la opinión: ' + rpcError.message }),
        { status: 500 }
      );
    }

    if (!rpcResult?.success) {
      const code = rpcResult?.code;
      const status = code === 'DUPLICATE_REVIEW' ? 409
        : code === 'NOT_PURCHASED' ? 403
        : 400;
      return new Response(
        JSON.stringify({ error: rpcResult?.error || 'Error desconocido' }),
        { status }
      );
    }

    return new Response(JSON.stringify(rpcResult.review), { status: 201 });
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
