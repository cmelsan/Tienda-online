import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils'; // Assuming this utility exists or I'll implement inline if needed

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
    const [status, setStatus] = useState(order.status);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (newStatus: string) => {
        console.log('🔄 Attempting to change status to:', newStatus);
        setIsUpdating(true);
        
        try {
            console.log('📡 Sending request to /api/admin/updatestatus');
            const response = await fetch('/api/admin/updatestatus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    newStatus: newStatus
                })
            });

            console.log('📨 Response status:', response.status);
            const data = await response.json();
            console.log('📦 Response data:', data);

            if (!response.ok || !data.success) {
                const errorMsg = data.message || `Error: ${response.status}`;
                console.error('❌ Status update error:', data);
                alert(`Error: ${errorMsg}\n\nDetalles: ${data.details || data.hint || 'Sin detalles'}`);
                setIsUpdating(false);
                return;
            }

            console.log('✅ Status changed successfully to:', newStatus);
            setStatus(newStatus);
            alert(`✅ Pedido actualizado a: ${newStatus}`);
            
            // Reload page to get fresh data from server
            setTimeout(() => {
                window.location.reload();
            }, 500);
            
        } catch (error) {
            console.error('❌ Catch error updating status:', error);
            alert('❌ Error de conexión: ' + (error instanceof Error ? error.message : 'Unknown error'));
            setIsUpdating(false);
        }
    };

    const formatDate = (date: string) => new Date(date).toLocaleDateString();
    const formatCurrency = (amount: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount / 100);

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'paid': return 'text-green-600 bg-green-50';
            case 'awaiting_payment': return 'text-yellow-600 bg-yellow-50';
            case 'shipped': return 'text-blue-600 bg-blue-50';
            case 'delivered': return 'text-purple-600 bg-purple-50';
            case 'cancelled': return 'text-red-600 bg-red-50';
            case 'return_requested': return 'text-orange-600 bg-orange-50';
            case 'returned': return 'text-indigo-600 bg-indigo-50';
            case 'refunded': return 'text-gray-600 bg-gray-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="py-4 px-6 text-sm font-medium text-gray-900 border-b border-gray-100">
                #{order.id.slice(0, 8)}
            </td>
            <td className="py-4 px-6 text-sm text-gray-500 border-b border-gray-100">
                {formatDate(order.created_at)}
            </td>
            <td className="py-4 px-6 text-sm text-gray-900 border-b border-gray-100">
                <div className="flex flex-col">
                    <span className="font-bold">{order.guest_email || order.customer_name || 'Usuario Registrado'}</span>
                    {order.user_id && <span className="text-xs text-gray-400">ID: {order.user_id.slice(0, 8)}</span>}
                </div>
            </td>
            <td className="py-4 px-6 text-sm text-gray-500 border-b border-gray-100">
                {order.items.length} productos
                <div className="text-xs text-gray-400 truncate max-w-[200px]">
                    {order.items.map(i => i.product?.name).join(', ')}
                </div>
            </td>
            <td className="py-4 px-6 text-sm font-bold text-gray-900 border-b border-gray-100">
                {formatCurrency(order.total_amount)}
            </td>
            <td className="py-4 px-6 border-b border-gray-100">
                <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={isUpdating || status === 'cancelled' || status === 'refunded'}
                    className={`block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-xs font-bold uppercase tracking-wider ${getStatusColor(status)}`}
                >
                    <option value="awaiting_payment">Pendiente</option>
                    <option value="paid">Pagado</option>
                    <option value="shipped">Enviado</option>
                    <option value="delivered">Entregado</option>
                    <option value="return_requested">Devolución Solicitada</option>
                    <option value="returned">Devuelto</option>
                    <option value="refunded">Reembolsado</option>
                    <option value="cancelled">Cancelado</option>
                </select>
            </td>
        </tr>
    );
}
