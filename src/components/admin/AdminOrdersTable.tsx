import { useState } from 'react';
import AdminOrderRow from './AdminOrderRow';

interface OrderItem {
    quantity: number;
    price_at_purchase: number;
    product: { name: string };
}

interface Order {
    id: string;
    order_number: string;
    created_at: string;
    status: string;
    total_amount: number;
    user_id: string | null;
    guest_email: string | null;
    order_items: OrderItem[];
    shipping_address?: any;
}

interface Props {
    orders: Order[];
}

export default function AdminOrdersTable({ orders }: Props) {
    const [query, setQuery] = useState('');

    const filtered = query.trim()
        ? orders.filter(o => {
              const q = query.toLowerCase();
              return (
                  (o.order_number || '').toLowerCase().includes(q) ||
                  (o.guest_email || '').toLowerCase().includes(q) ||
                  (o.status || '').toLowerCase().includes(q) ||
                  (o.user_id || '').toLowerCase().includes(q)
              );
          })
        : orders;

    if (!orders || orders.length === 0) {
        return (
            <div className="bg-white border border-gray-200 p-16 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sin pedidos</p>
                <p className="text-xs text-gray-400 mt-1">No hay pedidos disponibles todavia</p>
            </div>
        );
    }

    return (
        <div>
            {/* Buscador */}
            <div className="mb-4 relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
                </svg>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar por nº pedido, email, estado..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
                />
                {query && (
                    <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest">
                        {filtered.length} pedido{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            <div className="bg-white border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-black text-white">
                            <tr>
                                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Pedido</th>
                                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Fecha</th>
                                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Cliente</th>
                                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Productos</th>
                                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Total</th>
                                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Estado</th>
                                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length > 0 ? (
                                filtered.map((order) => (
                                    <AdminOrderRow key={order.id} order={order} />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                        Sin resultados para "{query}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
