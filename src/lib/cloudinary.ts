import { v2 as cloudinary } from 'cloudinary';

// Initialize Cloudinary with environment variables
cloudinary.config({
  cloud_name: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: import.meta.env.PUBLIC_CLOUDINARY_API_KEY,
  api_secret: import.meta.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

/**
 * Generate a signed upload signature for client-side uploads
 * This is more secure than exposing API key
 */
export function generateUploadSignature() {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder: 'eclat-beauty/products', // Organize uploads in folder
      resource_type: 'auto',
    },
    import.meta.env.CLOUDINARY_API_SECRET
  );

  return {
    timestamp,
    signature,
    apiKey: import.meta.env.PUBLIC_CLOUDINARY_API_KEY,
    cloudName: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME,
  };
}

/**
 * Get a Cloudinary image URL with transformations
 */
export function getCloudinaryUrl(publicId: string, options: {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'crop';
  quality?: 'auto' | 'low' | 'high';
  format?: 'auto' | 'webp' | 'jpg' | 'png';
} = {}) {
  const {
    width = 500,
    height = 500,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    quality,
    format,
    secure: true,
  });
}
