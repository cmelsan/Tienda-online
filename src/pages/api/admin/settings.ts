import type { APIRoute } from 'astro';
import { getAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async (context) => {
  try {
    console.log('[Settings API] POST request received');
    
    // Use createServerSupabaseClient which handles cookies automatically
    const userClient = await createServerSupabaseClient(context, true);
    
    // Check if user is authenticated via cookies
    const { data: { session }, error: sessionError } = await userClient.auth.getSession();
    
    if (sessionError || !session) {
      console.error('[Settings API] No session found:', sessionError);
      return new Response(JSON.stringify({ error: 'Unauthorized - no session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Settings API] User authenticated via cookies:', session.user.id);

    const { key, value } = await context.request.json();

    console.log('[Settings API] Updating setting:', key, '=', value);

    if (!key) {
      return new Response(JSON.stringify({ error: 'Key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use admin client to bypass RLS (CRITICAL FOR app_settings)
    const adminClient = getAdminSupabaseClient();
    
    if (!adminClient) {
      console.error('[Settings API] Admin client not available - RLS will be enforced');
      return new Response(JSON.stringify({ error: 'Server not properly configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Settings API] Using admin client to bypass RLS');

    // Upsert setting with admin client
    const { data: setting, error } = await adminClient
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

    console.log('[Settings API] Setting updated successfully:', setting);

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
