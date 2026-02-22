import type { APIRoute } from 'astro';
import { createServerSupabaseClient, createTokenClient } from '@/lib/supabase';

export const POST: APIRoute = async (context) => {
  try {
    const userClient = await createServerSupabaseClient(context, true);

    const { data: { session }, error: sessionError } = await userClient.auth.getSession();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Unauthorized - no session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check is_admin
    const { data: profile } = await userClient.from('profiles').select('is_admin').eq('id', session.user.id).single();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const { key, value } = await context.request.json();

    if (!key) {
      return new Response(JSON.stringify({ error: 'Key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = createTokenClient(session.access_token);

    // Upsert setting
    const { data: setting, error } = await client
      .from('app_settings')
      .upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select()
      .single();

    if (error) {
      console.error('[Settings API] Upsert error:', error);
      throw error;
    }

    return new Response(JSON.stringify({ success: true, setting }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Settings API] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
