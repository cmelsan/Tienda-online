import type { APIRoute } from 'astro';
import { createServerSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase';

async function checkAuth(context: any) {
  const authClient = await createServerSupabaseClient(context, true);
  const { data: { session } } = await authClient.auth.getSession();
  return session;
}

function adminDb() {
  const db = getAdminSupabaseClient();
  if (!db) throw new Error('Configuración de servidor incompleta: SUPABASE_SERVICE_ROLE_KEY no definida');
  return db;
}

// GET — list all subscribers
export const GET: APIRoute = async (context) => {
  const session = await checkAuth(context);
  if (!session) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  try {
    const supabase = adminDb();
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

// PATCH — toggle is_active for a subscriber
export const PATCH: APIRoute = async (context) => {
  const session = await checkAuth(context);
  if (!session) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id, is_active } = await context.request.json();
  if (!id) return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 });

  try {
    const supabase = adminDb();
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ is_active })
      .eq('id', id);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

// DELETE — remove a subscriber permanently
export const DELETE: APIRoute = async (context) => {
  const session = await checkAuth(context);
  if (!session) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { id } = await context.request.json();
  if (!id) return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 });

  try {
    const supabase = adminDb();
    const { error } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('id', id);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
