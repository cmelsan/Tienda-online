import { useState, useEffect } from 'react';
import { addNotification } from '@/stores/notifications';

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

const formatPrice = (cents: number) => {
  if (!cents || isNaN(cents)) return '0,00 €';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
};

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
      const response = await fetch('/api/admin/offers', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      setProducts(data.products || []);
      setSelectedOffers(data.featuredOffers || []);
    } catch (error) {
      addNotification(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
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
      const validOffers = selectedOffers.filter((offer) => offer.id && offer.id.trim());
      const response = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ featuredOffers: validOffers }),
      });
      const responseText = await response.text();
      if (!response.ok) {
        const error = JSON.parse(responseText);
        throw new Error(error.error || 'Error al guardar');
      }
      setMessage('ok');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-gray-400 uppercase tracking-widest">
        Cargando productos...
      </div>
    );
  }

  const selectedProducts = products.filter((p) =>
    selectedOffers.find((o) => o.id === p.id)
  );
  const totalProducts = products.length;
  const inRebaja = selectedOffers.length;
  const sinRebaja = totalProducts - inRebaja;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-black text-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total productos</p>
          <p className="text-3xl font-bold mt-1">{totalProducts}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">En rebaja</p>
          <p className="text-3xl font-bold text-black mt-1">{inRebaja}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sin rebaja</p>
          <p className="text-3xl font-bold text-black mt-1">{sinRebaja}</p>
        </div>
      </div>

      {/* Message */}
      {message === 'ok' && (
        <div className="p-4 bg-black text-white text-[10px] font-bold uppercase tracking-widest">
          Rebajas guardadas correctamente
        </div>
      )}
      {message === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold uppercase tracking-widest">
          Error al guardar. Inténtalo de nuevo.
        </div>
      )}

      {/* Selected Products */}
      <div className="border border-gray-200">
        <div className="bg-black px-6 py-4 flex items-center justify-between">
          <h2 className="text-[10px] font-bold text-white uppercase tracking-widest">
            Seleccionados ({selectedOffers.length})
          </h2>
          <button
            onClick={saveOffers}
            disabled={saving}
            className="px-5 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-pink-500 hover:text-white transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar rebajas'}
          </button>
        </div>

        {selectedProducts.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {selectedProducts.map((product) => {
              const offer = selectedOffers.find((o) => o.id === product.id);
              const discount = offer?.discount || 0;
              const discountedPrice = Math.round(product.price * (1 - discount / 100));
              return (
                <div
                  key={product.id}
                  className="px-6 py-4 flex items-center justify-between bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 overflow-hidden flex-shrink-0">
                      <img
                        src={product.images?.[0] || '/placeholder-product.jpg'}
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-black">{product.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatPrice(product.price)} → {formatPrice(discountedPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={discount}
                        onChange={(e) =>
                          updateDiscount(product.id, parseInt(e.target.value) || 0)
                        }
                        className="w-16 px-2 py-1.5 border border-gray-300 text-center font-bold text-sm focus:outline-none focus:border-black"
                      />
                      <span className="text-xs font-bold text-gray-500">%</span>
                    </div>
                    <button
                      onClick={() => toggleProduct(product.id)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-6 py-8 text-xs text-gray-400 text-center">
            Ningún producto seleccionado — haz clic en un producto para añadirlo
          </p>
        )}
      </div>

      {/* All Products Grid */}
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-black mb-4">
          Todos los productos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {products.map((product) => {
            const isSelected = !!selectedOffers.find((o) => o.id === product.id);
            return (
              <div
                key={product.id}
                onClick={() => toggleProduct(product.id)}
                className={`border-2 overflow-hidden cursor-pointer transition ${
                  isSelected ? 'border-black' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="aspect-square bg-gray-100 overflow-hidden relative">
                  <img
                    src={product.images?.[0] || '/placeholder-product.jpg'}
                    alt={product.name}
                    className="w-full h-full object-contain p-2"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-black text-white w-5 h-5 flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                  )}
                </div>
                <div className={`p-3 ${isSelected ? 'bg-black' : 'bg-white'}`}>
                  <p className="text-[9px] font-bold uppercase text-gray-400 mb-1">
                    {product.brand?.name || 'MARCA'}
                  </p>
                  <h4 className={`text-xs font-bold line-clamp-2 mb-1 ${isSelected ? 'text-white' : 'text-black'}`}>
                    {product.name}
                  </h4>
                  <p className={`text-xs font-bold ${isSelected ? 'text-pink-400' : 'text-gray-600'}`}>
                    {formatPrice(product.price)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {products.length === 0 && (
          <div className="py-16 text-center text-xs text-gray-400 uppercase tracking-widest">
            No hay productos disponibles
          </div>
        )}
      </div>
    </div>
  );
}
