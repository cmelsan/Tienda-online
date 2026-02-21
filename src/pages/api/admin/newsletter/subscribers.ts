import type { APIRoute } from 'astro';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET — list all subscribers
export const GET: APIRoute = async (context) => {
  const supabase = await createServerSupabaseClient(context, true);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

// PATCH — toggle is_active for a subscriber
export const PATCH: APIRoute = async (context) => {
  const supabase = await createServerSupabaseClient(context, true);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id, is_active } = await context.request.json();
  if (!id) return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 });

  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({ is_active })
    .eq('id', id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

// DELETE — remove a subscriber permanently
export const DELETE: APIRoute = async (context) => {
  const supabase = await createServerSupabaseClient(context, true);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id } = await context.request.json();
  if (!id) return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 });

  const { error } = await supabase
    .from('newsletter_subscribers')
    .delete()
    .eq('id', id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
