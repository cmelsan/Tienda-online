import type { APIRoute } from 'astro';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * GET /api/upload/signature
 * Generate a signature for unsigned upload to Cloudinary
 * This endpoint bypasses CSRF because it's a GET request
 */
export const GET: APIRoute = async () => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder: 'eclat-beauty/products',
        quality: 'auto',
        fetch_format: 'auto',
      },
      process.env.CLOUDINARY_API_SECRET!
    );

    return new Response(
      JSON.stringify({
        timestamp,
        signature,
        cloud_name: process.env.PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.PUBLIC_CLOUDINARY_API_KEY,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  } catch (error) {
    console.error('Signature generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate upload signature' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
};
