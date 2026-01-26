import type { APIRoute } from 'astro';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/upload
 * Upload a single image to Cloudinary
 * Body: multipart/form-data with 'file' field
 * Returns: { secure_url: string, public_id: string }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Check if user is authenticated (optional - add your auth check)
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400 }
      );
    }

    // Convert File to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    return new Promise((resolve) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'eclat-beauty/products',
          resource_type: 'auto',
          quality: 'auto',
          fetch_format: 'auto',
        },
        (error, result) => {
          if (error) {
            resolve(
              new Response(
                JSON.stringify({ error: `Upload failed: ${error.message}` }),
                { status: 500 }
              )
            );
          } else {
            resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  secure_url: result?.secure_url,
                  public_id: result?.public_id,
                  url: result?.url,
                }),
                { status: 200 }
              )
            );
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
