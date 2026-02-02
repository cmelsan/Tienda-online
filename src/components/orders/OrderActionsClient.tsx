import { useState } from 'react';
import ReturnModal from './ReturnModalClient';

interface OrderActionsClientProps {
    orderId: string;
    status: string;
    deliveredAt?: string | null;
    returnDeadline?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
    awaiting_payment: 'Pagando',
    paid: 'Pagado',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    return_requested: 'Devolución Solicitada',
    returned: 'Devuelto',
    refunded: 'Reembolsado'
};

const STATUS_COLORS: Record<string, string> = {
    awaiting_payment: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    paid: 'bg-green-50 text-green-700 border border-green-200',
    shipped: 'bg-blue-50 text-blue-700 border border-blue-200',
    delivered: 'bg-purple-50 text-purple-700 border border-purple-200',
    cancelled: 'bg-red-50 text-red-700 border border-red-200',
    return_requested: 'bg-orange-50 text-orange-700 border border-orange-200',
    returned: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    refunded: 'bg-teal-50 text-teal-700 border border-teal-200'
};

export default function OrderActionsClient({
    orderId,
    status,
    deliveredAt,
    returnDeadline
}: OrderActionsClientProps) {
    const [isCancelling, setIsCancelling] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(status);
    const [error, setError] = useState<string | null>(null);

    // Check if order can be cancelled (only if status is 'paid')
    const canCancel = currentStatus === 'paid';

    // Check if order can request return (only if status is 'delivered')
    const canRequestReturn = currentStatus === 'delivered';

    const handleCancelOrder = async () => {
        if (!confirm('¿Estás seguro? Esta acción no se puede deshacer.')) return;

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
                alert('✅ Pedido cancelado. El stock ha sido restaurado.');
                setCurrentStatus('cancelled');
                // Reload to show updated status
                setTimeout(() => window.location.reload(), 500);
            } else {
                setError(data.message || 'Error al cancelar');
                alert('❌ ' + (data.message || 'Error desconocido'));
            }
        } catch (err: any) {
            const msg = err.message || 'Error de conexión';
            setError(msg);
            alert('❌ ' + msg);
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Status Badge */}
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${STATUS_COLORS[currentStatus] || STATUS_COLORS.awaiting_payment}`}>
                {STATUS_LABELS[currentStatus] || currentStatus}
            </div>

            {/* Action Buttons */}
            {canCancel && (
                <button
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium text-sm rounded transition-colors disabled:opacity-50"
                >
                    {isCancelling ? '⏳ Cancelando...' : '❌ Cancelar Pedido'}
                </button>
            )}

            {canRequestReturn && (
                <button
                    onClick={() => setIsReturnModalOpen(true)}
                    className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium text-sm rounded transition-colors"
                >
                    📦 Solicitar Devolución
                </button>
            )}

            {error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
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
                />
            )}
        </div>
    );
}
