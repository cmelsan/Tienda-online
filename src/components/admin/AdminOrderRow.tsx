import { useState, useEffect } from 'react';

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
    const [status, setStatus] = useState<string>(() => {
        return order?.status ?? 'awaiting_payment';
    });
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        console.log('✅ AdminOrderRow mounted for order:', order?.id);
    }, [order?.id]);

    const handleStatusChange = async (newStatus: string) => {
        console.log('🔄 Changing status to:', newStatus);
        setIsUpdating(true);
        
        try {
            const response = await fetch('/api/admin/updatestatus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order?.id,
                    newStatus: newStatus
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                alert(`❌ Error: ${data.message}`);
                setIsUpdating(false);
                return;
            }

            console.log('✅ Status updated to:', newStatus);
            setStatus(newStatus);
            alert(`✅ Pedido actualizado a: ${newStatus}`);
            setIsUpdating(false);
            
        } catch (error) {
            console.error('❌ Error:', error);
            alert('❌ Error de conexión');
            setIsUpdating(false);
        }
    };

    const orderId = order?.id?.slice(0, 8) || 'N/A';
    const customerEmail = order?.guest_email || 'Usuario Registrado';
    const userId = order?.user_id?.slice(0, 8);
    const itemCount = order?.items?.length || 0;
    const dateStr = order?.created_at ? new Date(order.created_at).toLocaleDateString('es-ES') : '-';
    const total = order?.total_amount ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.total_amount / 100) : '-';
    const products = order?.items?.map(i => i?.product?.name).filter(Boolean).join(', ') || '-';

    const statusColors: Record<string, string> = {
        paid: 'text-green-600 bg-green-50',
        awaiting_payment: 'text-yellow-600 bg-yellow-50',
        shipped: 'text-blue-600 bg-blue-50',
        delivered: 'text-purple-600 bg-purple-50',
        cancelled: 'text-red-600 bg-red-50',
        return_requested: 'text-orange-600 bg-orange-50',
        returned: 'text-indigo-600 bg-indigo-50',
        refunded: 'text-gray-600 bg-gray-50',
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
                <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={isUpdating || status === 'cancelled' || status === 'refunded'}
                    className={`block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm text-xs font-bold uppercase ${statusColors[status] || 'text-gray-600 bg-gray-50'}`}
                >
                    <option value="awaiting_payment">Pendiente</option>
                    <option value="paid">Pagado</option>
                    <option value="shipped">Enviado</option>
                    <option value="delivered">Entregado</option>
                    <option value="return_requested">Devolución</option>
                    <option value="returned">Devuelto</option>
                    <option value="refunded">Reembolsado</option>
                    <option value="cancelled">Cancelado</option>
                </select>
            </td>
        </tr>
    );
}
