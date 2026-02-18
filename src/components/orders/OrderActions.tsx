import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { addNotification } from '@/stores/notifications';
import ReturnModal from './ReturnModal';

interface OrderActionsProps {
    orderId: string;
    status: string;
    deliveredAt?: string | null; // ISO timestamp when order was delivered
}

export default function OrderActions({ orderId, status, deliveredAt }: OrderActionsProps) {
    const [isCancelling, setIsCancelling] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(status);
    const [canReturn, setCanReturn] = useState(false);
    const [daysUntilDeadline, setDaysUntilDeadline] = useState<number | null>(null);

    useEffect(() => {
        // Calculate if return is allowed (within 30 days of delivery)
        if (currentStatus === 'delivered' && deliveredAt) {
            const deliveredDate = new Date(deliveredAt);
            const now = new Date();
            const daysSinceDelivery = Math.floor((now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
            const remainingDays = 30 - daysSinceDelivery;

            setCanReturn(remainingDays > 0);
            setDaysUntilDeadline(remainingDays > 0 ? remainingDays : 0);
        }
    }, [currentStatus, deliveredAt]);

    const handleCancelOrder = async () => {
        if (!confirm('¿Estás seguro de que quieres cancelar este pedido? Esta acción no se puede deshacer.')) return;

        setIsCancelling(true);
        try {
            const response = await fetch('/api/orders/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });

            const data = await response.json();

            if (data && data.success) {
                addNotification('Pedido cancelado correctamente. El stock ha sido restaurado.', 'success');
                setCurrentStatus('cancelled');
                window.location.reload();
            } else {
                addNotification('Error al cancelar: ' + (data?.message || 'Error desconocido'), 'error');
            }
        } catch (err: any) {
            console.error('Error cancelling order:', err);
            addNotification('Error de conexión al cancelar el pedido.', 'error');
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className="flex items-center gap-3">
            {/* Status Badges */}
            {currentStatus === 'cancelled' && (
                <span className="text-red-600 font-bold text-sm bg-red-50 px-3 py-1 rounded-full border border-red-100">
                    Cancelado
                </span>
            )}
            {currentStatus === 'awaiting_payment' && (
                <span className="text-yellow-600 font-bold text-sm bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                    Pagando
                </span>
            )}
            {currentStatus === 'paid' && (
                <span className="text-green-600 font-bold text-sm bg-green-50 px-3 py-1 rounded-full border border-green-100">
                    Pagado
                </span>
            )}
            {currentStatus === 'shipped' && (
                <span className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    Enviado
                </span>
            )}
            {currentStatus === 'delivered' && (
                <span className="text-purple-600 font-bold text-sm bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                    Entregado
                </span>
            )}
            {currentStatus === 'return_requested' && (
                <span className="text-orange-600 font-bold text-sm bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                    Devolución Solicitada
                </span>
            )}
            {currentStatus === 'returned' && (
                <span className="text-indigo-600 font-bold text-sm bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    Devuelto - Pendiente de Reembolso
                </span>
            )}
            {currentStatus === 'refunded' && (
                <span className="text-teal-600 font-bold text-sm bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                    Reembolsado
                </span>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                {/* Cancel button - only for paid orders */}
                {currentStatus === 'paid' && (
                    <button
                        onClick={handleCancelOrder}
                        disabled={isCancelling}
                        className="text-red-600 hover:text-red-800 text-xs font-bold underline decoration-red-600 underline-offset-2 transition-colors disabled:opacity-50"
                    >
                        {isCancelling ? 'Cancelando...' : 'Cancelar Pedido'}
                    </button>
                )}

                {/* Return button - only for delivered orders within 30 days */}
                {currentStatus === 'delivered' && canReturn && (
                    <>
                        <button
                            onClick={() => setIsReturnModalOpen(true)}
                            className="text-black hover:text-gray-600 text-xs font-bold underline decoration-black underline-offset-2 transition-colors"
                        >
                            Solicitar Devolución
                        </button>
                        {daysUntilDeadline !== null && daysUntilDeadline <= 7 && (
                            <span className="text-xs text-orange-600 font-medium">
                                ({daysUntilDeadline} {daysUntilDeadline === 1 ? 'día' : 'días'} restantes)
                            </span>
                        )}
                        <ReturnModal
                            isOpen={isReturnModalOpen}
                            onClose={() => setIsReturnModalOpen(false)}
                            orderId={orderId}
                            onReturnRequested={() => {
                                setCurrentStatus('return_requested');
                                setIsReturnModalOpen(false);
                            }}
                        />
                    </>
                )}

                {/* Show expiration message if delivered but past 30 days */}
                {currentStatus === 'delivered' && !canReturn && deliveredAt && (
                    <span className="text-xs text-gray-500 italic">
                        Plazo de devolución expirado
                    </span>
                )}

                {/* Info for return_requested status */}
                {currentStatus === 'return_requested' && (
                    <span className="text-xs text-gray-600 italic">
                        Tu solicitud está siendo revisada por nuestro equipo
                    </span>
                )}

                {/* Info for returned status */}
                {currentStatus === 'returned' && (
                    <span className="text-xs text-gray-600 italic">
                        Devolución aprobada. Procesando reembolso...
                    </span>
                )}
            </div>
        </div>
    );
}
