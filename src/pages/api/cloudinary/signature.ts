import type { APIRoute } from 'astro';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/cloudinary/signature
 * Generate a signature for unsigned upload to Cloudinary
 * Requires active admin session.
 */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Verify admin session
    const supabase = await createServerSupabaseClient({ cookies }, true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'No autenticado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Acceso denegado' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const cloudName = process.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Missing Cloudinary environment variables');
      console.error('cloudName:', cloudName);
      console.error('apiKey:', apiKey);
      console.error('apiSecret:', apiSecret ? 'SET' : 'NOT SET');
      return new Response(
        JSON.stringify({ error: 'Cloudinary not configured' }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create signature string - must match Cloudinary API requirements
    const signatureString = `folder=eclat-beauty/products&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash('sha1')
      .update(signatureString)
      .digest('hex');

    console.log('Signature generated successfully');

    return new Response(
      JSON.stringify({
        timestamp,
        signature,
        cloud_name: cloudName,
        api_key: apiKey,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Signature generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate upload signature', details: String(error) }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
};
