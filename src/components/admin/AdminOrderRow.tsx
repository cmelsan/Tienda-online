import { useState } from 'react';
import AdminOrderActions from './AdminOrderActions';

const STATUS_LABELS: Record<string, string> = {
    awaiting_payment: 'Esperando Pago',
    paid: 'Pagado',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    return_requested: 'Dev. Solicitada',
    returned: 'Devuelto',
    partially_returned: 'Dev. Parcial',
    refunded: 'Reembolsado',
    partially_refunded: 'Reemb. Parcial',
};

const STATUS_STYLES: Record<string, string> = {
    awaiting_payment: 'bg-amber-50 text-amber-700 border border-amber-200',
    paid: 'bg-black text-white',
    shipped: 'bg-gray-700 text-white',
    delivered: 'bg-gray-100 text-gray-700 border border-gray-300',
    cancelled: 'bg-red-50 text-red-700 border border-red-200',
    return_requested: 'bg-amber-50 text-amber-700 border border-amber-200',
    returned: 'bg-pink-50 text-pink-700 border border-pink-200',
    partially_returned: 'bg-pink-50 text-pink-600 border border-pink-200',
    refunded: 'bg-pink-100 text-pink-800 border border-pink-300',
    partially_refunded: 'bg-pink-100 text-pink-800 border border-pink-300',
};

interface OrderItem {
    quantity: number;
    price_at_purchase: number;
    product: {
        name: string;
    };
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
    stockIssue?: boolean;
}

interface AdminOrderRowProps {
    order: Order;
}

export default function AdminOrderRow({ order }: AdminOrderRowProps) {
    const [currentStatus, setCurrentStatus] = useState<string>(order?.status ?? 'awaiting_payment');

    const orderId = order?.order_number || 'N/A';
    const rawEmail = order?.guest_email || null;
    const customerEmail = rawEmail ? rawEmail.toLowerCase() : 'Usuario Registrado';
    const isGuest = !!rawEmail;
    const userId = order?.user_id?.slice(0, 8);
    const itemCount = order?.order_items?.length || 0;
    const products = order?.order_items?.map(i => i?.product?.name).filter(Boolean) || [];
    const dateStr = order?.created_at ? new Date(order.created_at).toLocaleDateString('es-ES') : '-';
    const total = order?.total_amount
        ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.total_amount / 100)
        : '-';

    const handleActionComplete = (newStatus: string) => {
        setCurrentStatus(newStatus);
    };

    const statusStyle = STATUS_STYLES[currentStatus] || 'bg-gray-100 text-gray-600 border border-gray-200';
    const statusLabel = STATUS_LABELS[currentStatus] || currentStatus;

    return (
        <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
            {/* Pedido */}
            <td className="py-4 px-4 whitespace-nowrap">
                <span className="text-xs font-black text-black tracking-tight">#{orderId}</span>
            </td>

            {/* Fecha */}
            <td className="py-4 px-4 whitespace-nowrap">
                <span className="text-xs text-gray-500">{dateStr}</span>
            </td>

            {/* Cliente */}
            <td className="py-4 px-4 max-w-[220px]">
                <div className="text-xs font-medium text-gray-900 truncate" title={customerEmail}>
                    {customerEmail}
                </div>
                {!isGuest && userId && (
                    <div className="text-[10px] text-gray-400 mt-0.5">{userId}</div>
                )}
            </td>

            {/* Productos */}
            <td className="py-4 px-4">
                <div className="text-xs text-gray-700">
                    <span className="font-semibold">{itemCount}</span>
                    <span className="text-gray-400"> {itemCount !== 1 ? 'productos' : 'producto'}</span>
                </div>
                {products.length > 0 && (
                    <div className="text-[10px] text-gray-400 mt-0.5 max-w-[160px] truncate" title={products.join(', ')}>
                        {products[0]}{products.length > 1 ? ` +${products.length - 1}` : ''}
                    </div>
                )}
            </td>

            {/* Total */}
            <td className="py-4 px-4 whitespace-nowrap">
                <span className="text-xs font-black text-black">{total}</span>
            </td>

            {/* Estado */}
            <td className="py-4 px-4">
                <div className="flex flex-col gap-1">
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 ${statusStyle}`}>
                        {statusLabel}
                    </span>
                    {order?.stockIssue && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 bg-orange-500 text-white">
                            ⚠ Stock insuficiente
                        </span>
                    )}
                </div>
            </td>

            {/* Acciones */}
            <td className="py-4 px-4">
                <AdminOrderActions
                    order={{ ...order, status: currentStatus }}
                    onActionComplete={handleActionComplete}
                />
            </td>
        </tr>
    );
}
