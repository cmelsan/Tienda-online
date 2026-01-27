import type { APIRoute } from 'astro';
import crypto from 'crypto';

/**
 * GET /api/cloudinary/signature
 * Generate a signature for unsigned upload to Cloudinary
 */
export const GET: APIRoute = async () => {
  try {
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
