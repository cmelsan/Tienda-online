import type { APIRoute } from 'astro';

/**
 * This file is kept for backwards compatibility
 * Image uploads are now handled directly by the client to Cloudinary
 * using signatures from /api/cloudinary/signature
 */

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ error: 'Use /api/cloudinary/signature instead' }),
    { 
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );
};
