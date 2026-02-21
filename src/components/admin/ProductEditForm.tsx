import { useState } from 'react';
import { slugify } from '@/lib/utils';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface ProductEditFormProps {
  product: any;
  categories: any[];
  subcategories: any[];
  brands: any[];
}

export default function ProductEditForm({ product, categories, subcategories, brands }: ProductEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(product.category_id);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name')?.toString();
    const description = formData.get('description')?.toString();
    const price = parseFloat(formData.get('price')?.toString() || '0');
    const stock = parseInt(formData.get('stock')?.toString() || '0');
    const category_id = formData.get('category_id')?.toString();
    const subcategory_id = formData.get('subcategory_id')?.toString() || null;
    const brand_id = formData.get('brand_id')?.toString() || null;
    const images = formData.get('images')?.toString().split('\n').filter(Boolean) || [];

    if (!name || !description || !category_id) {
      setErrorMessage('Por favor completa todos los campos requeridos');
      setIsSubmitting(false);
      return;
    }

    try {
      const slug = slugify(name);
      const priceInCents = Math.round(price * 100);

      const response = await fetch(`/api/admin/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          name,
          slug,
          description,
          price: priceInCents,
          stock,
          category_id,
          subcategory_id,
          brand_id,
          images,
        })
      });

      const data = await response.json();

      if (data.success) {
        // Redirect on success
        window.location.href = '/admin/productos';
      } else {
        setErrorMessage(`Error: ${data.message || 'No se pudo guardar'}`);
      }
    } catch (error: any) {
      setErrorMessage(`Error de conexión: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/products`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id })
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = '/admin/productos';
      } else {
        setErrorMessage(`Error: ${data.message || 'No se pudo eliminar'}`);
      }
    } catch (error: any) {
      setErrorMessage(`Error de conexión: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Eliminar producto"
        message="¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-soft p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-noir-900 mb-2">
              Nombre del Producto <span className="text-rose-500">*</span>
            </label>
            <input
              name="name"
              type="text"
              defaultValue={product.name}
              required
              className="w-full px-4 py-3 border border-noir-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200 bg-white text-noir-900"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-noir-900 mb-2">
              Descripción <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              required
              defaultValue={product.description}
              className="w-full px-4 py-3 border border-noir-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200 bg-white text-noir-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-noir-900 mb-2">
                Precio (EUR) <span className="text-rose-500">*</span>
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={(product.price / 100).toFixed(2)}
                className="w-full px-4 py-3 border border-noir-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200 bg-white text-noir-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-noir-900 mb-2">
                Stock <span className="text-rose-500">*</span>
              </label>
              <input
                name="stock"
                type="number"
                min="0"
                required
                defaultValue={product.stock.toString()}
                className="w-full px-4 py-3 border border-noir-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200 bg-white text-noir-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-noir-900 mb-2">
              Categoría <span className="text-rose-500">*</span>
            </label>
            <select
              id="category_id"
              name="category_id"
              required
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 border border-noir-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200 bg-white text-noir-900"
            >
              {categories?.map((category: any) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="subcategory_id" className="block text-sm font-medium text-noir-900 mb-2">
              Subcategoría
            </label>
            <select
              id="subcategory_id"
              name="subcategory_id"
              defaultValue={product.subcategory_id || ''}
              className="w-full px-4 py-3 border border-noir-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200 bg-white text-noir-900"
            >
              <option value="">Seleccionar Subcategoría</option>
              {subcategories?.map((sub: any) => (
                <option key={sub.id} value={sub.id} style={{ display: sub.category_id === selectedCategory ? 'block' : 'none' }}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="brand_id" className="block text-sm font-medium text-noir-900 mb-2">
              Marca
            </label>
            <select
              id="brand_id"
              name="brand_id"
              defaultValue={product.brand_id || ''}
              className="w-full px-4 py-3 border border-noir-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200 bg-white text-noir-900"
            >
              <option value="">SIN MARCA / GENÉRICO</option>
              {brands?.map((brand: any) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="images" className="block text-sm font-medium text-noir-900 mb-2">
              URLs de Imágenes
            </label>
            <textarea
              id="images"
              name="images"
              rows={3}
              defaultValue={product.images && product.images.join('\n')}
              className="w-full px-4 py-3 border border-noir-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all duration-200 bg-white text-noir-900 font-mono text-sm"
            />
            <p className="text-xs text-noir-600 mt-1">Una URL por línea.</p>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-noir-200">
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-beauty-red text-white rounded-lg font-medium hover:bg-beauty-pink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <a
                href="/admin/productos"
                className="px-6 py-3 text-noir-700 hover:bg-cream-100 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting}
              className="px-6 py-3 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Eliminar Producto
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
