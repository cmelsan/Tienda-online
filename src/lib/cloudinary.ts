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
 * Transform a Cloudinary URL with optimization
 * Adds format auto, quality auto, and width for responsive images
 * 
 * Original URL: https://res.cloudinary.com/.../v123/image.jpg (4MB)
 * Optimized: https://res.cloudinary.com/.../f_auto,q_auto,w_500/v123/image.jpg (30KB)
 */
export function optimizeCloudinaryUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'crop' | 'thumb';
    quality?: 'auto' | 'low' | 'high';
    format?: 'auto' | 'webp' | 'jpg' | 'png' | 'avif';
  } = {}
): string {
  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options;

  if (!url.includes('cloudinary.com')) {
    return url; // Return original if not a Cloudinary URL
  }

  // Build transformation parameters
  const params: string[] = [];

  // Format optimization (auto detects best format like WebP, AVIF)
  params.push(`f_${format}`);

  // Quality optimization (auto reduces quality imperceptibly)
  params.push(`q_${quality}`);

  // Dimensions if provided
  if (width) params.push(`w_${width}`);
  if (height && !width) params.push(`h_${height}`);
  if (width && height) params.push(`c_${crop}`);

  const transformation = params.join(',');

  // Insert transformation between /upload/ and /v...
  // Original: https://res.cloudinary.com/cloud/image/upload/v123/folder/image.jpg
  // Result:   https://res.cloudinary.com/cloud/image/upload/f_auto,q_auto,w_500/v123/folder/image.jpg
  return url.replace('/upload/', `/upload/${transformation}/`);
}

/**
 * Get preset URLs for common product image sizes
 */
export function getProductImageUrls(url: string) {
  return {
    // Thumbnail for listings (200x200)
    thumbnail: optimizeCloudinaryUrl(url, {
      width: 200,
      height: 200,
      crop: 'fill',
      quality: 'auto',
      format: 'auto',
    }),

    // Catalog view (400x400)
    catalog: optimizeCloudinaryUrl(url, {
      width: 400,
      height: 400,
      crop: 'fill',
      quality: 'auto',
      format: 'auto',
    }),

    // Gallery/detail (800x800)
    gallery: optimizeCloudinaryUrl(url, {
      width: 800,
      height: 800,
      crop: 'fill',
      quality: 'auto',
      format: 'auto',
    }),

    // Full width (1200x1200)
    fullWidth: optimizeCloudinaryUrl(url, {
      width: 1200,
      height: 1200,
      crop: 'fit',
      quality: 'auto',
      format: 'auto',
    }),

    // Original (only optimize format/quality, no resizing)
    original: optimizeCloudinaryUrl(url, {
      quality: 'auto',
      format: 'auto',
    }),
  };
}

/**
 * Generate srcset for responsive images
 * Usage: <img src={urls.catalog} srcset={generateSrcSet(originalUrl)} />
 */
export function generateSrcSet(url: string): string {
  const sizes = [200, 400, 600, 800, 1000];
  return sizes
    .map((width) => {
      const optimized = optimizeCloudinaryUrl(url, {
        width,
        quality: 'auto',
        format: 'auto',
      });
      return `${optimized} ${width}w`;
    })
    .join(', ');
}
