import type { APIRoute } from 'astro';
import { createServerSupabaseClient, getAdminSupabaseClient, supabase } from '@/lib/supabase';

export const PUT: APIRoute = async (context) => {
  const { request, params } = context;
  try {
    const serverSupabase = await createServerSupabaseClient(context);
    const { data: { session } } = await serverSupabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { rating, comment } = body;

    if (!rating) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS (auth.uid() is null in server routes without cookie session)
    const adminClient = getAdminSupabaseClient() || supabase;

    // Verify ownership
    const { data: review, error: fetchError } = await adminClient
      .from('reviews')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !review) {
      return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404 });
    }

    if (review.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    // Update review
    const { data: updated, error: updateError } = await adminClient
      .from('reviews')
      .update({
        rating,
        comment: comment?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id) // extra safety: only update own review
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (error) {
    console.error('Error updating review:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};

export const DELETE: APIRoute = async (context) => {
  const { params } = context;
  try {
    const serverSupabase = await createServerSupabaseClient(context);
    const { data: { session } } = await serverSupabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { id } = params;

    // Use admin client to bypass RLS
    const adminClient = getAdminSupabaseClient() || supabase;

    // Verify ownership
    const { data: review, error: fetchError } = await adminClient
      .from('reviews')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !review) {
      return new Response(JSON.stringify({ error: 'Review not found' }), { status: 404 });
    }

    if (review.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    // Delete review (extra safety: filter by user_id too)
    const { error: deleteError } = await adminClient
      .from('reviews')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ message: 'Reseña eliminada' }), { status: 200 });
  } catch (error) {
    console.error('Error deleting review:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
