import React, { useState, useRef } from 'react';

interface ImageUploaderProps {
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export default function ImageUploader({
  onImagesChange,
  maxImages = 5,
}: ImageUploaderProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAddMore = images.length < maxImages;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo debe ser menor a 5MB');
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Get upload signature from server
      const signatureResponse = await fetch('/api/upload/signature');
      if (!signatureResponse.ok) {
        throw new Error('Error al obtener firma de subida');
      }
      const { timestamp, signature, cloud_name, api_key } = await signatureResponse.json();

      // Upload directly to Cloudinary using signed upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', api_key);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', 'eclat-beauty/products');
      formData.append('quality', 'auto');
      formData.append('fetch_format', 'auto');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Error al conectar con Cloudinary');
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message || 'Error en la subida a Cloudinary');
      }

      // Add the image URL to the list
      const newImages = [...images, result.secure_url];
      setImages(newImages);
      onImagesChange(newImages); // Notify parent component
      
      // Reset
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
          Fotos del Producto
        </label>
        <span className="text-xs text-gray-500">
          {images.length}/{maxImages}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {/* Upload Area */}
      {canAddMore && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="fileInput"
          />
          <label
            htmlFor="fileInput"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
                <span className="text-sm text-gray-600">Subiendo...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  Haz clic o arrastra una imagen
                </span>
                <span className="text-xs text-gray-500">
                  PNG, JPG, WebP (máx. 5MB)
                </span>
              </>
            )}
          </label>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="relative w-full max-w-xs mx-auto border border-gray-200 rounded-lg overflow-hidden">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
            </div>
          )}
        </div>
      )}

      {/* Images Gallery */}
      {images.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
            Imágenes Subidas
          </label>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {images.map((url, index) => (
              <div
                key={index}
                className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
              >
                <img
                  src={url}
                  alt={`Product ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 text-xs font-bold rounded">
                    Principal
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden input to store image URLs - used by parent form */}
      <input
        type="hidden"
        name="images"
        value={images.join('\n')}
      />
    </div>
  );
}
