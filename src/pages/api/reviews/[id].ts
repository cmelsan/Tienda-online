import type { APIRoute } from 'astro';
import { createServerSupabaseClient, createTokenClient } from '@/lib/supabase';

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

    // Use token client — RLS policies allow users to update only their own reviews
    const client = createTokenClient(session.access_token);

    const { data: updated, error: updateError } = await client
      .from('reviews')
      .update({
        rating,
        comment: comment?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !updated) {
      return new Response(JSON.stringify({ error: 'Reseña no encontrada o sin permiso' }), { status: 404 });
    }

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

    // Use token client — RLS policies allow users to delete only their own reviews
    const client = createTokenClient(session.access_token);

    const { error: deleteError } = await client
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
