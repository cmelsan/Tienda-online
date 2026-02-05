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

interface FeaturedOffer {
  id: string;
  discount: number;
}

export default function OffersManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedOffers, setSelectedOffers] = useState<FeaturedOffer[]>([]);
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
      setSelectedOffers(data.featuredOffers || []);
    } catch (error) {
      console.error('[OffersManager] Error fetching data:', error);
      alert(`Error al cargar datos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedOffers((prev) => {
      const isSelected = prev.find((o) => o.id === productId);
      if (isSelected) {
        return prev.filter((o) => o.id !== productId);
      } else {
        return [...prev, { id: productId, discount: 20 }];
      }
    });
  };

  const updateDiscount = (productId: string, discount: number) => {
    setSelectedOffers((prev) =>
      prev.map((o) => (o.id === productId ? { ...o, discount } : o))
    );
  };

  const saveOffers = async () => {
    try {
      setSaving(true);
      setMessage('');

      console.log('[OffersManager] Saving featured offers:', selectedOffers);

      const response = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ featuredOffers: selectedOffers }),
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

  const selectedProducts = products.filter((p) =>
    selectedOffers.find((o) => o.id === p.id)
  );

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
            Productos en Rebaja ({selectedOffers.length})
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
          <div className="space-y-3">
            {selectedProducts.map((product) => {
              const offer = selectedOffers.find((o) => o.id === product.id);
              const discount = offer?.discount || 0;
              const discountedPrice = Math.round(product.price * (1 - discount / 100));
              
              return (
                <div
                  key={product.id}
                  className="bg-white border border-blue-300 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-black mb-1">{product.name}</h4>
                    <p className="text-sm text-gray-600">
                      Precio: {(product.price / 100).toFixed(2)}€ → {(discountedPrice / 100).toFixed(2)}€
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={discount}
                        onChange={(e) =>
                          updateDiscount(product.id, parseInt(e.target.value) || 0)
                        }
                        className="w-20 px-3 py-2 border border-gray-300 rounded text-center font-bold"
                      />
                      <span className="text-sm font-bold text-gray-700">%</span>
                    </div>
                    <button
                      onClick={() => toggleProduct(product.id)}
                      className="px-3 py-2 bg-rose-600 text-white text-sm font-bold rounded hover:bg-rose-700 transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Sin productos seleccionados aún</p>
        )}
      </div>

      {/* All Products Grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Todos los Productos</h2>
        <p className="text-sm text-gray-600 mb-4">Haz clic en un producto para añadirlo a rebajas</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {products.map((product) => {
            const isSelected = selectedOffers.find((o) => o.id === product.id);
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
