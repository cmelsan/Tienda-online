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
    shipping_address: any;
}

interface Props {
    orders: Order[];
}

export default function AdminOrdersTable({ orders }: Props) {
    if (!orders || orders.length === 0) {
        return (
            <div className="bg-white border border-gray-200 p-16 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sin pedidos</p>
                <p className="text-xs text-gray-400 mt-1">No hay pedidos disponibles todavia</p>
            </div>
        );
    }

    return (
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
                        {orders.map((order) => (
                            <AdminOrderRow key={order.id} order={order} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
