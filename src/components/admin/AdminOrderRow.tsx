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
    refunded: 'Reembolsado',
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
    created_at: string;
    status: string;
    total_amount: number;
    user_id: string | null;
    guest_email: string | null;
    items: OrderItem[];
    shipping_address: any;
}

interface AdminOrderRowProps {
    order: Order;
}

export default function AdminOrderRow({ order }: AdminOrderRowProps) {
    const [currentStatus, setCurrentStatus] = useState<string>(order?.status ?? 'awaiting_payment');

    const orderId = order?.id?.slice(0, 8) || 'N/A';
    const customerEmail = order?.guest_email || 'Usuario Registrado';
    const userId = order?.user_id?.slice(0, 8);
    const itemCount = order?.items?.length || 0;
    const dateStr = order?.created_at ? new Date(order.created_at).toLocaleDateString('es-ES') : '-';
    const total = order?.total_amount ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.total_amount / 100) : '-';
    const products = order?.items?.map(i => i?.product?.name).filter(Boolean).join(', ') || '-';

    const handleActionComplete = (newStatus: string) => {
        setCurrentStatus(newStatus);
    };

    return (
        <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td className="py-3 px-4 text-xs font-bold text-gray-900">#{orderId}</td>
            <td className="py-3 px-4 text-xs text-gray-500">{dateStr}</td>
            <td className="py-3 px-4 text-xs text-gray-900">
                <span className="font-medium block">{customerEmail}</span>
                {userId && <span className="text-gray-400 text-xs">{userId}</span>}
            </td>
            <td className="py-3 px-4 text-xs text-gray-500">
                <span className="block">{itemCount} prods</span>
                <span className="text-xs text-gray-400 truncate max-w-xs block">{products}</span>
            </td>
            <td className="py-3 px-4 text-xs font-bold text-gray-900">{total}</td>
            <td className="py-3 px-4 text-xs font-semibold text-gray-600">{STATUS_LABELS[currentStatus] || currentStatus}</td>
            <td className="py-3 px-4">
                <AdminOrderActions 
                    order={{ ...order, status: currentStatus }} 
                    onActionComplete={handleActionComplete}
                />
            </td>
        </tr>
    );
}
