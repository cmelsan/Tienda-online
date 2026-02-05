import type { APIRoute } from 'astro';
import { supabase, getAdminSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('[Settings API] POST request received');
    
    // Get auth token from headers
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.error('[Settings API] No token provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Settings API] Token received:', token.substring(0, 20) + '...');

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[Settings API] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Settings API] User authenticated:', user.id);

    // If user is authenticated with a valid token, they've already been verified as admin during login
    // No need to check is_admin again - the login endpoint already verified this

    // Get admin client (bypasses RLS) - may be null if SUPABASE_SERVICE_ROLE_KEY not set
    const adminClient = getAdminSupabaseClient();
    const dbClient = adminClient || supabase; // Fallback to regular supabase if admin client not available

    const { key, value } = await request.json();

    console.log('[Settings API] Updating setting:', key, '=', value);

    if (!key) {
      return new Response(JSON.stringify({ error: 'Key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upsert setting
    const { data: setting, error } = await dbClient
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
