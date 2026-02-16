import { useState, useEffect } from 'react';
import { addNotification } from '@/stores/notifications';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  is_flash_sale: boolean;
  flash_sale_discount: number;
  flash_sale_end_time: string;
}

export default function FlashSaleManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('[FlashSaleManager] Fetching products...');
      
      const response = await fetch('/api/admin/flash-sales', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies for auth
      });

      console.log('[FlashSaleManager] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('[FlashSaleManager] Products loaded:', data.data?.length || 0);
      setProducts(data.data || []);
    } catch (error) {
      console.error('[FlashSaleManager] Error fetching products:', error);
      addNotification(`Error al cargar productos: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateFlashSale = async (productId: string, updateData: any) => {
    try {
      setUpdating(true);

      console.log('[FlashSaleManager] Updating flash sale:', productId, updateData);

      const response = await fetch('/api/admin/flash-sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies for auth
        body: JSON.stringify({
          productId,
          data: updateData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error updating');
      }

      await fetchProducts();
    } catch (error) {
      console.error('[FlashSaleManager] Error updating flash sale:', error);
      addNotification(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const toggleFlashSale = async (product: Product) => {
    const endTime = product.is_flash_sale 
      ? null 
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await updateFlashSale(product.id, {
      is_flash_sale: !product.is_flash_sale,
      flash_sale_end_time: endTime,
      flash_sale_discount: product.is_flash_sale ? 0 : product.flash_sale_discount || 20
    });
  };

  const updateDiscount = async (productId: string, discount: number) => {
    await updateFlashSale(productId, { flash_sale_discount: discount });
  };

  const updateEndTime = async (productId: string, endTime: string) => {
    await updateFlashSale(productId, { 
      flash_sale_end_time: new Date(endTime).toISOString() 
    });
  };

  if (loading) {
    return <div className="text-center py-8">Cargando productos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-blue-900 mb-2">📌 Cómo funcionan las Flash Sales</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Activa/desactiva productos para la sección Flash Sale de la página de inicio</li>
          <li>✓ Establece el descuento (%) que aplicará a cada producto</li>
          <li>✓ Define la hora de finalización de la oferta</li>
          <li>✓ Solo se mostrarán si está habilitado en Settings</li>
        </ul>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="text-left p-3 font-bold">Producto</th>
              <th className="text-left p-3 font-bold">Precio</th>
              <th className="text-center p-3 font-bold">En Flash Sale</th>
              <th className="text-center p-3 font-bold">Descuento (%)</th>
              <th className="text-left p-3 font-bold">Finaliza</th>
              <th className="text-center p-3 font-bold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-3">
                  <div>
                    <div className="font-semibold text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.slug}</div>
                  </div>
                </td>
                <td className="p-3 text-gray-700">{(product.price / 100).toFixed(2)} €</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => toggleFlashSale(product)}
                    disabled={updating}
                    className={`inline-block px-4 py-2 rounded text-white font-bold text-sm transition ${
                      product.is_flash_sale
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-gray-400 hover:bg-gray-500'
                    } disabled:opacity-50`}
                  >
                    {product.is_flash_sale ? '✓ Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="p-3 text-center">
                  {product.is_flash_sale && (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={product.flash_sale_discount || 0}
                      onChange={(e) =>
                        updateDiscount(product.id, parseInt(e.target.value))
                      }
                      disabled={updating}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center font-bold disabled:opacity-50"
                    />
                  )}
                </td>
                <td className="p-3">
                  {product.is_flash_sale && (
                    <input
                      type="datetime-local"
                      value={
                        product.flash_sale_end_time
                          ? new Date(product.flash_sale_end_time)
                              .toISOString()
                              .slice(0, 16)
                          : ''
                      }
                      onChange={(e) => updateEndTime(product.id, e.target.value)}
                      disabled={updating}
                      className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    />
                  )}
                </td>
                <td className="p-3 text-center text-xs text-gray-500">
                  {product.is_flash_sale && product.flash_sale_end_time && (
                    <div>
                      <span className="font-bold text-rose-600">
                        {Math.ceil(
                          (new Date(product.flash_sale_end_time).getTime() -
                            new Date().getTime()) /
                            (1000 * 60 * 60)
                        )}{' '}
                        hrs
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No hay productos disponibles
        </div>
      )}
    </div>
  );
}
