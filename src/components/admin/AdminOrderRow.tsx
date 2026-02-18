import { useState } from 'react';
import AdminOrderActions from './AdminOrderActions';

const STATUS_LABELS: Record<string, string> = {
    awaiting_payment: 'Esperando Pago',
    paid: 'Pagado',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    return_requested: 'Devolución Solicitada',
    returned: 'Devuelto',
    partially_returned: 'Parcialmente Devuelto',
    refunded: 'Reembolsado',
    partially_refunded: 'Reembolso Parcial',
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
    shipping_address: any;
}

interface AdminOrderRowProps {
    order: Order;
}

export default function AdminOrderRow({ order }: AdminOrderRowProps) {
    const [currentStatus, setCurrentStatus] = useState<string>(order?.status ?? 'awaiting_payment');

    const orderId = order?.order_number || 'N/A';
    const customerEmail = order?.guest_email || 'Usuario Registrado';
    const userId = order?.user_id?.slice(0, 8);
    const itemCount = order?.order_items?.length || 0;
    const dateStr = order?.created_at ? new Date(order.created_at).toLocaleDateString('es-ES') : '-';
    const total = order?.total_amount ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.total_amount / 100) : '-';
    const products = order?.order_items?.map(i => i?.product?.name).filter(Boolean).join(', ') || '-';

    const handleActionComplete = (newStatus: string) => {
        setCurrentStatus(newStatus);
    };

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="py-4 px-4 text-xs font-bold text-black whitespace-nowrap">#{orderId}</td>
            <td className="py-4 px-4 text-xs text-gray-600 whitespace-nowrap">{dateStr}</td>
            <td className="py-4 px-4 text-xs min-w-[250px]">
                <div className="font-medium text-gray-900 truncate">{customerEmail}</div>
                {userId && <div className="text-gray-400 text-xs">{userId}</div>}
            </td>
            <td className="py-4 px-4 text-xs text-gray-600 whitespace-nowrap">
                <span className="font-semibold">{itemCount}</span> producto{itemCount !== 1 ? 's' : ''}
            </td>
            <td className="py-4 px-4 text-xs font-bold text-black whitespace-nowrap">{total}</td>
            <td className="py-4 px-4 text-xs">
                <span className="inline-block font-semibold text-gray-600 px-2 py-1 bg-gray-100 rounded">
                    {STATUS_LABELS[currentStatus] || currentStatus}
                </span>
            </td>
            <td className="py-4 px-4 text-xs">
                <AdminOrderActions 
                    order={{ ...order, status: currentStatus }} 
                    onActionComplete={handleActionComplete}
                />
            </td>
        </tr>
    );
}
