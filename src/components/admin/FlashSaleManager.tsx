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

function getTimeStatus(endTime: string | null): {
  label: string;
  color: string;
  isExpired: boolean;
  hoursLeft: number;
} {
  if (!endTime) return { label: 'â€”', color: 'text-gray-400', isExpired: false, hoursLeft: 0 };
  const diff = new Date(endTime).getTime() - Date.now();
  const hoursLeft = diff / (1000 * 60 * 60);

  if (diff <= 0) {
    const hoursAgo = Math.abs(Math.ceil(hoursLeft));
    return { label: `Expirada hace ${hoursAgo}h`, color: 'text-red-600', isExpired: true, hoursLeft };
  }

  const h = Math.floor(hoursLeft);
  const m = Math.floor((hoursLeft - h) * 60);

  if (hoursLeft < 1) {
    return { label: `${m}m restantes`, color: 'text-red-500 font-bold animate-pulse', isExpired: false, hoursLeft };
  }
  if (hoursLeft < 24) {
    return { label: `${h}h ${m}m restantes`, color: 'text-orange-500 font-bold', isExpired: false, hoursLeft };
  }
  return { label: `${h}h restantes`, color: 'text-emerald-600 font-semibold', isExpired: false, hoursLeft };
}

export default function FlashSaleManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deactivatingAll, setDeactivatingAll] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/flash-sales', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido');
      }
      const data = await response.json();
      const prods: Product[] = data.data || [];

      // Auto-deactivate expired products
      const expired = prods.filter(
        (p) => p.is_flash_sale && p.flash_sale_end_time && new Date(p.flash_sale_end_time).getTime() < Date.now()
      );

      if (expired.length > 0) {
        await Promise.all(
          expired.map((p) =>
            fetch('/api/admin/flash-sales', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                productId: p.id,
                data: { is_flash_sale: false, flash_sale_end_time: null, flash_sale_discount: 0 },
              }),
            })
          )
        );
        addNotification(
          `${expired.length} oferta${expired.length > 1 ? 's' : ''} expirada${expired.length > 1 ? 's' : ''} desactivada${expired.length > 1 ? 's' : ''} automÃ¡ticamente`,
          'info'
        );
        // Refetch with clean data
        const r2 = await fetch('/api/admin/flash-sales', { credentials: 'include' });
        const d2 = await r2.json();
        setProducts(d2.data || []);
      } else {
        setProducts(prods);
      }
    } catch (error) {
      addNotification(`Error al cargar productos: ${error instanceof Error ? error.message : 'Error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateFlashSale = async (productId: string, updateData: any) => {
    try {
      setUpdating(productId);
      const response = await fetch('/api/admin/flash-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, data: updateData }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar');
      }
      await fetchProducts();
    } catch (error) {
      addNotification(`Error: ${error instanceof Error ? error.message : 'Error'}`, 'error');
    } finally {
      setUpdating(null);
    }
  };

  const toggleFlashSale = async (product: Product) => {
    const endTime = product.is_flash_sale
      ? null
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await updateFlashSale(product.id, {
      is_flash_sale: !product.is_flash_sale,
      flash_sale_end_time: endTime,
      flash_sale_discount: product.is_flash_sale ? 0 : product.flash_sale_discount || 20,
    });
  };

  const updateDiscount = async (productId: string, discount: number) => {
    await updateFlashSale(productId, { flash_sale_discount: discount });
  };

  const updateEndTime = async (productId: string, endTime: string) => {
    await updateFlashSale(productId, { flash_sale_end_time: new Date(endTime).toISOString() });
  };

  const deactivateAllExpired = async () => {
    const expired = products.filter(
      (p) => p.is_flash_sale && p.flash_sale_end_time && new Date(p.flash_sale_end_time).getTime() < Date.now()
    );
    if (expired.length === 0) return;
    setDeactivatingAll(true);
    await Promise.all(
      expired.map((p) =>
        updateFlashSale(p.id, { is_flash_sale: false, flash_sale_end_time: null, flash_sale_discount: 0 })
      )
    );
    setDeactivatingAll(false);
    addNotification(`${expired.length} oferta(s) desactivadas`, 'success');
  };

  const activeProducts = products.filter((p) => p.is_flash_sale);
  const expiredActive = activeProducts.filter(
    (p) => p.flash_sale_end_time && new Date(p.flash_sale_end_time).getTime() < Date.now()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mr-3"></div>
        <span className="text-gray-600">Cargando productos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">ðŸ“Œ CÃ³mo funcionan las Flash Sales</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>âœ“ Activa productos para la secciÃ³n Flash Sale de la pÃ¡gina de inicio</li>
          <li>âœ“ Establece el descuento (%) y la hora de finalizaciÃ³n</li>
          <li>âœ“ Las ofertas expiradas se desactivan automÃ¡ticamente al cargar esta pÃ¡gina</li>
          <li>âœ“ La secciÃ³n se oculta en la tienda cuando el tiempo llega a cero</li>
        </ul>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-black text-gray-900">{products.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Total productos</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-black text-rose-600">{activeProducts.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">En Flash Sale</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-black text-emerald-600">
            {activeProducts.filter((p) => !p.flash_sale_end_time || new Date(p.flash_sale_end_time).getTime() > Date.now()).length}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Activas y vigentes</div>
        </div>
      </div>

      {/* Expired warning */}
      {expiredActive.length > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-300 rounded-lg px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-red-600 text-xl">âš ï¸</span>
            <div>
              <div className="font-bold text-red-700">
                {expiredActive.length} oferta{expiredActive.length > 1 ? 's' : ''} con tiempo expirado
              </div>
              <div className="text-sm text-red-600">
                Siguen marcadas como activas pero ya no se muestran en la tienda.
              </div>
            </div>
          </div>
          <button
            onClick={deactivateAllExpired}
            disabled={deactivatingAll}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold text-sm transition disabled:opacity-50 whitespace-nowrap"
          >
            {deactivatingAll ? 'Desactivando...' : 'Desactivar expiradas'}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600">Producto</th>
              <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600">Precio</th>
              <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600">Estado</th>
              <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600">Descuento</th>
              <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600">Finaliza</th>
              <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600">Tiempo restante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((product) => {
              const isUpdating = updating === product.id;
              const timeStatus = getTimeStatus(product.is_flash_sale ? product.flash_sale_end_time : null);
              const rowBg = timeStatus.isExpired
                ? 'bg-red-50'
                : product.is_flash_sale
                ? 'bg-white'
                : 'bg-gray-50/40';

              return (
                <tr key={product.id} className={`${rowBg} transition-colors`}>
                  {/* Product */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 text-sm">{product.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{product.slug}</div>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 text-right">
                    <div className="font-bold text-gray-800">{(product.price / 100).toFixed(2)} â‚¬</div>
                    {product.is_flash_sale && product.flash_sale_discount > 0 && (
                      <div className="text-xs text-rose-600 font-semibold">
                        â†’ {((product.price * (1 - product.flash_sale_discount / 100)) / 100).toFixed(2)} â‚¬
                      </div>
                    )}
                  </td>

                  {/* Toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleFlashSale(product)}
                      disabled={isUpdating}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                        product.is_flash_sale
                          ? timeStatus.isExpired
                            ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                            : 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      } disabled:opacity-50`}
                    >
                      {isUpdating ? (
                        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                      ) : product.is_flash_sale ? (
                        timeStatus.isExpired ? 'âš  Expirada' : 'âœ“ Activa'
                      ) : (
                        'Inactiva'
                      )}
                    </button>
                  </td>

                  {/* Discount */}
                  <td className="px-4 py-3 text-center">
                    {product.is_flash_sale ? (
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={product.flash_sale_discount || 0}
                          onChange={(e) => updateDiscount(product.id, parseInt(e.target.value))}
                          onBlur={(e) => updateDiscount(product.id, parseInt(e.target.value))}
                          disabled={isUpdating}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center font-bold text-sm focus:border-rose-400 focus:outline-none disabled:opacity-50"
                        />
                        <span className="text-gray-500 text-xs">%</span>
                      </div>
                    ) : (
                      <span className="text-gray-300">â€”</span>
                    )}
                  </td>

                  {/* End time */}
                  <td className="px-4 py-3">
                    {product.is_flash_sale ? (
                      <input
                        type="datetime-local"
                        value={
                          product.flash_sale_end_time
                            ? new Date(product.flash_sale_end_time).toISOString().slice(0, 16)
                            : ''
                        }
                        onChange={(e) => updateEndTime(product.id, e.target.value)}
                        disabled={isUpdating}
                        className="px-2 py-1 border border-gray-300 rounded text-xs focus:border-rose-400 focus:outline-none disabled:opacity-50 w-full max-w-[180px]"
                      />
                    ) : (
                      <span className="text-gray-300 text-sm">â€”</span>
                    )}
                  </td>

                  {/* Time remaining */}
                  <td className="px-4 py-3 text-center">
                    {product.is_flash_sale && product.flash_sale_end_time ? (
                      <span className={`text-xs ${timeStatus.color}`}>{timeStatus.label}</span>
                    ) : (
                      <span className="text-gray-300 text-xs">â€”</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            No hay productos disponibles
          </div>
        )}
      </div>
    </div>
  );
}

