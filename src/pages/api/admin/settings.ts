import type { APIRoute } from 'astro';
import { supabase, getAdminSupabaseClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get auth token from headers
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get admin client (bypasses RLS) - may be null if SUPABASE_SERVICE_ROLE_KEY not set
    const adminClient = getAdminSupabaseClient();
    const dbClient = adminClient || supabase; // Fallback to regular supabase if admin client not available

    // Check if user is admin
    const { data: profile, error: profileError } = await dbClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      console.log('[Admin API] User is not admin:', user.id, 'Profile error:', profileError, 'Profile:', profile);
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { key, value } = await request.json();

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

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, setting }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
