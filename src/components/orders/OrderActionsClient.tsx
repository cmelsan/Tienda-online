import { useState } from 'react';
import { addNotification } from '@/stores/notifications';
import ReturnModal from './ReturnModalClient';

interface OrderItem {
    id: string;
    quantity: number;
    price_at_purchase: number;
    return_status?: string | null;
    product: {
        name: string;
        images?: string[];
        slug?: string;
    };
}

interface OrderActionsClientProps {
    orderId: string;
    status: string;
    deliveredAt?: string | null;
    returnDeadline?: string | null;
    items?: OrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
    awaiting_payment: 'Pagando',
    paid: 'Pagado',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    return_requested: 'Devolución Solicitada',
    returned: 'Devuelto',
    partially_returned: 'Parcialmente Devuelto',
    refunded: 'Reembolsado',
    partially_refunded: 'Reembolso Parcial'
};

const STATUS_COLORS: Record<string, string> = {
    awaiting_payment: 'text-gray-600',
    paid: 'text-gray-600',
    shipped: 'text-gray-600',
    delivered: 'text-gray-600',
    cancelled: 'text-gray-400',
    return_requested: 'text-gray-600',
    returned: 'text-gray-600',
    refunded: 'text-gray-600',
    partially_returned: 'text-orange-600',
    partially_refunded: 'text-orange-600'
};

export default function OrderActionsClient({
    orderId,
    status,
    deliveredAt,
    returnDeadline,
    items = []
}: OrderActionsClientProps) {
    const [isCancelling, setIsCancelling] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(status);
    const [error, setError] = useState<string | null>(null);

    // Check if order can be cancelled (only if status is 'paid')
    const canCancel = currentStatus === 'paid';

    // Check if order can request return (delivered or partially_returned with returnable items)
    const hasReturnableItems = items.some(i => !i.return_status || i.return_status === 'rejected');
    const canRequestReturn = (currentStatus === 'delivered' || currentStatus === 'partially_returned') && hasReturnableItems;

    const handleCancelOrder = async () => {
        if (!confirm('¿Estás seguro de que deseas cancelar este pedido? Esta acción no se puede deshacer.')) return;

        setIsCancelling(true);
        setError(null);

        try {
            const response = await fetch('/api/orders/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });

            const data = await response.json();

            if (data.success) {
                addNotification('Pedido cancelado exitosamente. El stock ha sido restaurado.', 'success');
                setCurrentStatus('cancelled');
                setTimeout(() => window.location.reload(), 500);
            } else {
                setError(data.message || 'Error al cancelar');
                addNotification('Error: ' + (data.message || 'Error desconocido'), 'error');
            }
        } catch (err: any) {
            const msg = err.message || 'Error de conexión';
            setError(msg);
            addNotification('Error: ' + msg, 'error');
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className="flex flex-col gap-2 items-end">
            {/* Status Badge */}
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600">
                {STATUS_LABELS[currentStatus] || currentStatus}
            </div>

            {/* Action Buttons - Horizontal */}
            {(canCancel || canRequestReturn) && (
                <div className="flex gap-2 flex-wrap justify-end">
                    {canCancel && (
                        <button
                            onClick={handleCancelOrder}
                            disabled={isCancelling}
                            className="px-3 py-2 border border-gray-300 text-gray-900 font-medium text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                            {isCancelling ? 'Cancelando...' : 'Cancelar Pedido'}
                        </button>
                    )}

                    {canRequestReturn && (
                        <button
                            onClick={() => setIsReturnModalOpen(true)}
                            className="px-3 py-2 border border-gray-300 text-gray-900 font-medium text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                            Solicitar Devolución
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div className="text-xs text-red-600">
                    {error}
                </div>
            )}

            {/* Return Modal */}
            {canRequestReturn && (
                <ReturnModal
                    isOpen={isReturnModalOpen}
                    onClose={() => setIsReturnModalOpen(false)}
                    orderId={orderId}
                    returnDeadline={returnDeadline}
                    items={items}
                />
            )}
        </div>
    );
}
