import { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  brand?: {
    name: string;
  };
}

export default function OffersManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('[OffersManager] Fetching products and featured offers...');

      const response = await fetch('/api/admin/offers', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[OffersManager] Data loaded:', data);
      
      setProducts(data.products || []);
      setSelectedProductIds(data.featuredOffers || []);
    } catch (error) {
      console.error('[OffersManager] Error fetching data:', error);
      alert(`Error al cargar datos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) => {
      const isSelected = prev.includes(productId);
      if (isSelected) {
        return prev.filter((id) => id !== productId);
      } else {
        // Max 5 products
        if (prev.length >= 5) {
          setMessage('⚠️ Máximo 5 productos permitidos');
          setTimeout(() => setMessage(''), 3000);
          return prev;
        }
        return [...prev, productId];
      }
    });
  };

  const saveOffers = async () => {
    try {
      setSaving(true);
      setMessage('');

      console.log('[OffersManager] Saving featured offers:', selectedProductIds);

      const response = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ featuredOffers: selectedProductIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar');
      }

      setMessage('✅ Rebajas actualizadas correctamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('[OffersManager] Error saving:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando productos...</div>;
  }

  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`p-4 border text-xs font-bold uppercase tracking-wide ${
            message.includes('❌')
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : 'bg-green-50 border-green-200 text-green-600'
          }`}
        >
          {message}
        </div>
      )}

      {/* Selected Products */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-blue-900">
            Productos Seleccionados ({selectedProductIds.length}/5)
          </h2>
          <button
            onClick={saveOffers}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white font-bold text-sm rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Rebajas'}
          </button>
        </div>

        {selectedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {selectedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border-2 border-blue-500 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition"
                onClick={() => toggleProduct(product.id)}
              >
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={product.images?.[0] || '/placeholder-product.jpg'}
                    alt={product.name}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div className="p-3">
                  <p className="text-[9px] font-bold uppercase text-gray-500 mb-1">
                    {product.brand?.name || 'MARCA'}
                  </p>
                  <h4 className="text-sm font-bold text-black line-clamp-2 mb-2">
                    {product.name}
                  </h4>
                  <p className="text-xs font-bold text-blue-600">
                    {(product.price / 100).toFixed(2)} €
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Sin productos seleccionados aún</p>
        )}
      </div>

      {/* All Products Grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Todos los Productos</h2>
        <p className="text-sm text-gray-600 mb-4">Haz clic en un producto para añadirlo o eliminarlo de las rebajas</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {products.map((product) => {
            const isSelected = selectedProductIds.includes(product.id);
            return (
              <div
                key={product.id}
                onClick={() => toggleProduct(product.id)}
                className={`border-2 rounded-lg overflow-hidden cursor-pointer transition hover:shadow-lg ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="aspect-square bg-gray-100 overflow-hidden relative">
                  <img
                    src={product.images?.[0] || '/placeholder-product.jpg'}
                    alt={product.name}
                    className="w-full h-full object-contain p-2"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm">
                      ✓
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[9px] font-bold uppercase text-gray-500 mb-1">
                    {product.brand?.name || 'MARCA'}
                  </p>
                  <h4 className="text-xs font-bold text-black line-clamp-2 mb-2">
                    {product.name}
                  </h4>
                  <p className={`text-xs font-bold ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
                    {(product.price / 100).toFixed(2)} €
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No hay productos disponibles
        </div>
      )}
    </div>
  );
}
