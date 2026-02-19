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

function getTimeStatus(endTime: string | null, isActive: boolean): {
  label: string;
  color: string;
  isExpired: boolean;
} {
  if (!isActive || !endTime) return { label: '-', color: 'text-gray-300', isExpired: false };
  const diff = new Date(endTime).getTime() - Date.now();
  const hoursLeft = diff / (1000 * 60 * 60);

  if (diff <= 0) {
    const hoursAgo = Math.abs(Math.ceil(hoursLeft));
    return { label: `Expirada hace ${hoursAgo}h`, color: 'text-red-600 font-bold', isExpired: true };
  }

  const h = Math.floor(hoursLeft);
  const m = Math.floor((hoursLeft - h) * 60);

  if (hoursLeft < 1) {
    return { label: `${m}m restantes`, color: 'text-red-500 font-bold', isExpired: false };
  }
  if (hoursLeft < 24) {
    return { label: `${h}h ${m}m restantes`, color: 'text-gray-600 font-semibold', isExpired: false };
  }
  return { label: `${h}h restantes`, color: 'text-gray-400 font-medium', isExpired: false };
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
      setProducts(data.data || []);
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
    const turningOn = !product.is_flash_sale;
    // Si se activa: siempre pone fecha nueva (24h por defecto), aunque hubiera una fecha expirada
    const existingEndTime = product.flash_sale_end_time
      ? new Date(product.flash_sale_end_time).getTime() > Date.now()
        ? product.flash_sale_end_time  // fecha vigente, la conservamos
        : null                          // fecha expirada, la ignoramos
      : null;
    const endTime = turningOn
      ? (existingEndTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      : null;

    await updateFlashSale(product.id, {
      is_flash_sale: turningOn,
      flash_sale_end_time: endTime,
      flash_sale_discount: turningOn ? (product.flash_sale_discount || 20) : 0,
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
    for (const p of expired) {
      await updateFlashSale(p.id, { is_flash_sale: false, flash_sale_end_time: null, flash_sale_discount: 0 });
    }
    setDeactivatingAll(false);
    addNotification(`${expired.length} oferta(s) desactivadas`, 'success');
  };

  const activeProducts = products.filter((p) => p.is_flash_sale);
  const expiredActive = activeProducts.filter(
    (p) => p.flash_sale_end_time && new Date(p.flash_sale_end_time).getTime() < Date.now()
  );
  const vigentesCount = activeProducts.filter(
    (p) => !p.flash_sale_end_time || new Date(p.flash_sale_end_time).getTime() > Date.now()
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-8 w-8 border-b-2 border-black mr-3"></div>
        <span className="text-xs text-gray-400 uppercase tracking-widest">Cargando productos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-black mb-2">Cómo funcionan las Flash Sales</h3>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>- Activa productos para la sección Flash Sale de la home</li>
          <li>- Establece el descuento (%) y la hora de finalización</li>
          <li>- Puedes cambiar la fecha sin perder la configuración</li>
          <li>- La sección se oculta en la tienda cuando el tiempo llega a cero</li>
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-black text-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total productos</p>
          <p className="text-3xl font-bold mt-1">{products.length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">En Flash Sale</p>
          <p className="text-3xl font-bold text-black mt-1">{activeProducts.length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Activas y vigentes</p>
          <p className="text-3xl font-bold text-black mt-1">{vigentesCount}</p>
        </div>
      </div>

      {/* Expired warning - solo si hay expiradas, no desactiva automaticamente */}
      {expiredActive.length > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-300 px-5 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-700">
              {expiredActive.length} oferta{expiredActive.length > 1 ? 's' : ''} con tiempo expirado
            </div>
            <div className="text-xs text-red-500 mt-1">
              Siguen marcadas como activas. Cambia la fecha o desáctivalas.
            </div>
          </div>
          <button
            onClick={deactivateAllExpired}
            disabled={deactivatingAll}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 font-bold text-[10px] uppercase tracking-widest transition disabled:opacity-50 whitespace-nowrap ml-4"
          >
            {deactivatingAll ? 'Desactivando...' : 'Desactivar expiradas'}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black">
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white">Producto</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white">Precio</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white">Estado</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white">Descuento</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white">Finaliza</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white">Tiempo restante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((product) => {
              const isUpdating = updating === product.id;
              const timeStatus = getTimeStatus(product.flash_sale_end_time, product.is_flash_sale);
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
                    <div className="font-bold text-gray-800">{(product.price / 100).toFixed(2)} &euro;</div>
                    {product.is_flash_sale && product.flash_sale_discount > 0 && (
                      <div className="text-xs text-rose-500 font-semibold">
                        con dto: {((product.price * (1 - product.flash_sale_discount / 100)) / 100).toFixed(2)} &euro;
                      </div>
                    )}
                  </td>

                  {/* Toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleFlashSale(product)}
                      disabled={isUpdating}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition ${
                        product.is_flash_sale
                          ? timeStatus.isExpired
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-300'
                            : 'bg-black text-white hover:bg-pink-500'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      {isUpdating ? (
                        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                      ) : product.is_flash_sale ? (
                        timeStatus.isExpired ? 'Expirada' : 'Activa'
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
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setProducts((prev) =>
                              prev.map((p) => (p.id === product.id ? { ...p, flash_sale_discount: val } : p))
                            );
                          }}
                          onBlur={(e) => updateDiscount(product.id, parseInt(e.target.value))}
                          disabled={isUpdating}
                          className="w-16 px-2 py-1 border border-gray-300 text-center font-bold text-sm focus:border-black focus:outline-none disabled:opacity-50"
                        />
                        <span className="text-gray-500 text-xs">%</span>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-sm">-</span>
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
                        className="px-2 py-1 border border-gray-300 text-xs focus:border-black focus:outline-none disabled:opacity-50 w-full max-w-[180px]"
                      />
                    ) : (
                      <span className="text-gray-300 text-sm">-</span>
                    )}
                  </td>

                  {/* Time remaining */}
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs ${timeStatus.color}`}>{timeStatus.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-16 text-xs text-gray-400 uppercase tracking-widest">
            No hay productos disponibles
          </div>
        )}
      </div>
    </div>
  );
}

