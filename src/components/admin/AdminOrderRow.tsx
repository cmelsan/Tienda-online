import { useState } from 'react';
import AdminOrderActions from './AdminOrderActions';

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
        <tr className="hover:bg-gray-50 transition-colors" suppressHydrationWarning>
            <td className="py-4 px-6 text-sm font-medium text-gray-900 border-b border-gray-100">#{orderId}</td>
            <td className="py-4 px-6 text-sm text-gray-500 border-b border-gray-100">{dateStr}</td>
            <td className="py-4 px-6 text-sm text-gray-900 border-b border-gray-100">
                <div className="flex flex-col">
                    <span className="font-bold">{customerEmail}</span>
                    {userId && <span className="text-xs text-gray-400">ID: {userId}</span>}
                </div>
            </td>
            <td className="py-4 px-6 text-sm text-gray-500 border-b border-gray-100">
                {itemCount} productos
                <div className="text-xs text-gray-400 truncate max-w-xs">{products}</div>
            </td>
            <td className="py-4 px-6 text-sm font-bold text-gray-900 border-b border-gray-100">{total}</td>
            <td className="py-4 px-6 border-b border-gray-100">
                <AdminOrderActions 
                    order={{ ...order, status: currentStatus }} 
                    onActionComplete={handleActionComplete}
                />
            </td>
        </tr>
    );
}
