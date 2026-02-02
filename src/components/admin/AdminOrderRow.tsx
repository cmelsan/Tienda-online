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

interface UserProfile {
    id: string;
    name: string | null;
    email: string | null;
}

interface Order {
    id: string;
    created_at: string;
    status: string;
    total_amount: number;
    user_id: string | null;
    guest_email: string | null;
    user: UserProfile | null;
    order_items: OrderItem[];
}

interface AdminOrderRowProps {
    order: Order;
}

export default function AdminOrderRow({ order }: AdminOrderRowProps) {
    const [currentStatus, setCurrentStatus] = useState<string>(order?.status ?? 'awaiting_payment');

    const orderId = order?.id?.slice(0, 8) || 'N/A';
    const itemCount = order?.order_items?.length || 0;
    const dateStr = order?.created_at ? new Date(order.created_at).toLocaleDateString('es-ES') : '-';
    const total = order?.total_amount ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.total_amount / 100) : '-';
    const products = order?.order_items?.map(i => i?.product?.name).filter(Boolean).join(', ') || '-';
    
    // Get customer name or email
    let customerName = 'Invitado';
    let customerEmail = '';
    
    if (order?.user) {
        customerName = order.user.name || order.user.email || 'Usuario Registrado';
        customerEmail = order.user.email || '';
    } else if (order?.guest_email) {
        customerEmail = order.guest_email;
    }

    const handleActionComplete = (newStatus: string) => {
        setCurrentStatus(newStatus);
    };

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="py-3 px-4 text-xs font-bold text-black">#{orderId}</td>
            <td className="py-3 px-4 text-xs text-gray-600">{dateStr}</td>
            <td className="py-3 px-4 text-xs text-gray-600">
                <span className="font-medium block">{customerName}</span>
                {customerEmail && <span className="text-gray-400 text-xs">{customerEmail}</span>}
            </td>
            <td className="py-3 px-4 text-xs text-gray-600">
                <span className="block font-medium">{itemCount} productos</span>
                <span className="text-xs text-gray-400 truncate max-w-xs block">{products}</span>
            </td>
            <td className="py-3 px-4 text-xs font-medium text-black">{total}</td>
            <td className="py-3 px-4">
                <span className="inline-block text-xs font-semibold text-gray-600">
                    {STATUS_LABELS[currentStatus] || currentStatus}
                </span>
            </td>
            <td className="py-3 px-4 text-xs space-x-2 flex gap-2">
                <AdminOrderActions 
                    order={{ ...order, status: currentStatus }} 
                    onActionComplete={handleActionComplete}
                />
            </td>
        </tr>
    );
}
