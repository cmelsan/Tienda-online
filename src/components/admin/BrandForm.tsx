import { useState } from 'react';

interface BrandFormProps {
  brand?: any;
  isEdit?: boolean;
}

export default function BrandForm({ brand, isEdit = false }: BrandFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    name: brand?.name || '',
    slug: brand?.slug || '',
    description: brand?.description || '',
    logo_url: brand?.logo_url || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    if (!formData.name || !formData.slug) {
      setErrorMsg('Nombre y Slug son obligatorios.');
      setIsSubmitting(false);
      return;
    }

    try {
      const url = '/api/admin/brands';
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = isEdit 
        ? { id: brand.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = '/admin/marcas';
      } else {
        setErrorMsg(data.error || data.message || 'Error al guardar la marca');
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <a href="/admin/marcas" className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-wider transition-colors mb-4 block">
          ← Volver al listado
        </a>
        <h1 className="text-2xl font-bold text-black uppercase tracking-widest">
          {isEdit ? 'Editar Marca' : 'Crear Nueva Marca'}
        </h1>
      </div>

      <div className="max-w-2xl">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 text-sm font-medium mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 border border-gray-200">
          
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Nombre de la Marca <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border-b border-gray-300 py-2 text-sm focus:border-black focus:outline-none transition-colors placeholder-gray-400 font-medium"
              placeholder="Ej: L'Oréal Paris"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Slug (URL) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              required
              className="w-full border-b border-gray-300 py-2 text-sm focus:border-black focus:outline-none transition-colors placeholder-gray-400 font-mono text-gray-600"
              placeholder="ej: loreal-paris"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Descripción
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full border-b border-gray-300 py-2 text-sm focus:border-black focus:outline-none transition-colors placeholder-gray-400 resize-none"
              placeholder="Cuéntanos sobre la marca..."
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              URL del Logo
            </label>
            <input
              type="url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleChange}
              className="w-full border-b border-gray-300 py-2 text-sm focus:border-black focus:outline-none transition-colors placeholder-gray-400"
              placeholder="https://example.com/logo.png"
            />
            {formData.logo_url && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
                <img 
                  src={formData.logo_url} 
                  alt="Logo preview" 
                  className="max-w-xs h-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3EError%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-8 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-black text-white font-bold uppercase tracking-wider text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar Marca' : 'Crear Marca'}
            </button>
            <a
              href="/admin/marcas"
              className="px-6 py-3 border border-gray-300 text-black font-bold uppercase tracking-wider text-sm hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </a>
          </div>
        </form>
      </div>
    </>
  );
}
