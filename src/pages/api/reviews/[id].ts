import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const PUT: APIRoute = async ({ request, params }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
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

    // Verify ownership
    const { data: review, error: fetchError } = await supabase
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
    const { data: updated, error: updateError } = await supabase
      .from('reviews')
      .update({
        rating,
        comment: comment?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }

    const { id } = params;

    // Verify ownership
    const { data: review, error: fetchError } = await supabase
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

    // Delete review
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ message: 'Review deleted' }), { status: 200 });
  } catch (error) {
    console.error('Error deleting review:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
