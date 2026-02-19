import { useState, useCallback, useMemo } from 'react';
import { addNotification } from '@/stores/notifications';

interface Order {
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
}

interface AdminOrderActionsProps {
    order: Order;
    onActionComplete?: (newStatus: string) => void;
}

type ActionType = 'cancel' | 'ship' | 'deliver' | 'process_return' | 'refund';

const ACTION_ENDPOINTS: Record<ActionType, string> = {
    cancel: '/api/admin/cancel-order',
    ship: '/api/admin/mark-shipped',
    deliver: '/api/admin/mark-delivered',
    process_return: '/api/admin/process-return',
    refund: '/api/admin/process-refund'
};

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

export default function AdminOrderActions({ order, onActionComplete }: AdminOrderActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalAction, setModalAction] = useState<ActionType | null>(null);
    const [notes, setNotes] = useState('');
    const [restoreStock, setRestoreStock] = useState(false);
    const [refundAmount, setRefundAmount] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Determine available actions based on status
    const availableActions = useMemo(() => {
        const actions: Array<{
            type: ActionType;
            label: string;
            requiresNotes?: boolean;
            requiresConfirm?: boolean;
            showRestoreStock?: boolean;
        }> = [];

        switch (order.status) {
            case 'awaiting_payment':
                break;
            case 'paid':
                actions.push({
                    type: 'ship',
                    label: 'Marcar Enviado',
                    requiresConfirm: true
                });
                actions.push({
                    type: 'cancel',
                    label: 'Cancelar Pedido',
                    requiresNotes: true,
                    requiresConfirm: true
                });
                break;
            case 'shipped':
                actions.push({
                    type: 'deliver',
                    label: 'Marcar Entregado',
                    requiresConfirm: true
                });
                break;
            case 'delivered':
                break;
            case 'return_requested':
                actions.push({
                    type: 'process_return',
                    label: 'Aceptar Devolución',
                    requiresNotes: false,
                    requiresConfirm: true,
                    showRestoreStock: true
                });
                actions.push({
                    type: 'refund',
                    label: 'Procesar Reembolso',
                    requiresNotes: true,
                    requiresConfirm: true
                });
                break;
            case 'returned':
                actions.push({
                    type: 'refund',
                    label: 'Procesar Reembolso',
                    requiresNotes: true,
                    requiresConfirm: true
                });
                break;
            case 'partially_returned':
                actions.push({
                    type: 'refund',
                    label: 'Procesar Reembolso Parcial',
                    requiresNotes: true,
                    requiresConfirm: true
                });
                break;
        }

        return actions;
    }, [order.status]);

    const handleActionClick = (action: ActionType, requiresModal: boolean) => {
        if (requiresModal) {
            setModalAction(action);
            setShowModal(true);
            setError(null);
            setNotes('');
            setRestoreStock(false);
            setRefundAmount(null);
        } else {
            executeAction(action);
        }
    };

    const executeAction = async (action: ActionType) => {
        setIsLoading(true);
        setError(null);

        try {
            const endpoint = ACTION_ENDPOINTS[action];
            if (!endpoint) throw new Error('Invalid action');

            const payload: any = {
                orderId: order.id,
                notes: notes || undefined
            };

            switch (action) {
                case 'process_return':
                    payload.newStatus = 'returned';
                    payload.restoreStock = restoreStock;
                    break;
                case 'refund':
                    if (refundAmount !== null) {
                        payload.refundAmount = refundAmount;
                    }
                    break;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setError(data.message || 'Error al procesar la acción');
                return;
            }

            setShowModal(false);
            setNotes('');
            setRestoreStock(false);
            
            if (onActionComplete && data.data?.new_status) {
                onActionComplete(data.data.new_status);
            }

            addNotification(data.data?.message || 'Acción completada exitosamente', 'success');
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!modalAction) return;
        executeAction(modalAction);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setModalAction(null);
        setNotes('');
        setRestoreStock(false);
        setRefundAmount(null);
        setError(null);
    };

    const currentAction = availableActions.find(a => a.type === modalAction);

    // State for inline delete confirmation modal
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDeletePending = async () => {
        setIsLoading(true);
        setShowDeleteConfirm(false);
        try {
            const res = await fetch(`/api/orders/delete-pending?orderId=${order.id}`, { method: 'DELETE' });
            let data: any = {};
            try { data = await res.json(); } catch {}
            if (res.ok && data.success) {
                addNotification('Pedido eliminado correctamente', 'success');
                setTimeout(() => window.location.reload(), 600);
            } else {
                addNotification(data.error || 'Error al eliminar el pedido', 'error');
            }
        } catch (err: any) {
            addNotification('Error: ' + (err?.message || 'desconocido'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (availableActions.length === 0) {
        if (order.status === 'awaiting_payment') {
            return (
                <>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isLoading}
                        className="text-[11px] text-red-400 hover:text-red-600 font-semibold transition-colors disabled:opacity-40"
                    >
                        {isLoading ? 'Eliminando...' : 'Eliminar'}
                    </button>

                    {/* Inline delete confirmation modal */}
                    {showDeleteConfirm && (
                        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                            <div className="bg-white shadow-2xl p-8 max-w-sm w-full mx-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Confirmar acción</p>
                                        <h3 className="text-sm font-black text-black">Eliminar pedido abandonado</h3>
                                    </div>
                                    <div className="w-6 h-0.5 bg-red-400"></div>
                                </div>
                                <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-700 text-xs leading-relaxed">
                                    Este pedido está en estado <strong>Esperando Pago</strong> y nunca se completó. Al eliminarlo se borrarán también sus líneas de pedido. Esta acción no se puede deshacer.
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-500 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleDeletePending}
                                        className="flex-1 px-4 py-2.5 bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-colors"
                                    >
                                        Sí, eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            );
        }
        return <span className="text-[10px] text-gray-300 uppercase tracking-widest">—</span>;
    }

    const ACTION_STYLES: Record<ActionType, string> = {
        ship: 'text-black hover:text-pink-500 font-semibold',
        deliver: 'text-black hover:text-pink-500 font-semibold',
        cancel: 'text-red-400 hover:text-red-600 font-semibold',
        process_return: 'text-pink-600 hover:text-pink-800 font-semibold',
        refund: 'text-pink-600 hover:text-pink-800 font-semibold',
    };

    return (
        <div className="flex gap-3 items-center flex-wrap">
            {availableActions.map(action => (
                <button
                    key={action.type}
                    onClick={() => handleActionClick(action.type, action.requiresConfirm || action.requiresNotes || false)}
                    disabled={isLoading}
                    className={`text-[11px] transition-colors disabled:opacity-40 ${ACTION_STYLES[action.type]}`}
                >
                    {isLoading && modalAction === action.type ? 'Procesando...' : action.label}
                </button>
            ))}
            
            {/* Modal */}
            {showModal && currentAction && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white shadow-2xl p-8 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Confirmar accion</p>
                                <h3 className="text-sm font-black text-black">{currentAction.label}</h3>
                            </div>
                            <div className="w-6 h-0.5 bg-pink-500"></div>
                        </div>

                        {/* Notes Input */}
                        {currentAction.requiresNotes && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notas (opcional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Añade notas sobre esta acción..."
                                    className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                                    rows={3}
                                />
                            </div>
                        )}

                        {/* Refund Amount Input - Only for refund action */}
                        {modalAction === 'refund' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Monto de Reembolso (opcional - dejar vacío para reembolso total)
                                </label>
                                <div className="flex gap-2">
                                    <span className="text-gray-600 py-2">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={order.total_amount}
                                        value={refundAmount === null ? '' : refundAmount}
                                        onChange={(e) => setRefundAmount(e.target.value ? parseFloat(e.target.value) : null)}
                                        placeholder="Dejar vacío para reembolso total"
                                        className="flex-1 px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                                    />
                                </div>
                                {refundAmount !== null && (
                                    <p className="text-xs text-gray-600 mt-1">
                                        {refundAmount === order.total_amount 
                                            ? 'Reembolso completo' 
                                            : `Reembolso parcial de $${refundAmount.toFixed(2)} de $${order.total_amount.toFixed(2)}`}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Restore Stock Checkbox */}
                        {currentAction.showRestoreStock && (
                            <div className="mb-4 flex items-center">
                                <input
                                    type="checkbox"
                                    id="restore-stock"
                                    checked={restoreStock}
                                    onChange={(e) => setRestoreStock(e.target.checked)}
                                    className="h-4 w-4 text-gray-900 border-gray-300"
                                />
                                <label htmlFor="restore-stock" className="ml-2 text-sm text-gray-700">
                                    Restaurar stock del inventario
                                </label>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
                                {error}
                            </div>
                        )}

                        {/* Confirmation Message */}
                        <div className="mb-6 p-3 bg-gray-50 border border-gray-200 text-gray-600 text-xs">
                            {modalAction === 'ship' && 'Marcar este pedido como enviado.'}
                            {modalAction === 'deliver' && 'Marcar este pedido como entregado. Se calculará el plazo de devolución (14 días).'}
                            {modalAction === 'cancel' && 'Cancelar este pedido y restaurar stock. Esta acción no se puede deshacer.'}
                            {modalAction === 'process_return' && 'Aceptar esta devolución del cliente.'}
                            {modalAction === 'refund' && (
                                <>
                                    {refundAmount === null || refundAmount === order.total_amount 
                                        ? 'Procesar reembolso completo. El dinero ($' + order.total_amount.toFixed(2) + ') se enviará al método de pago original.'
                                        : 'Procesar reembolso parcial de $' + refundAmount.toFixed(2) + ' de $' + order.total_amount.toFixed(2) + '. El dinero se enviará al método de pago original.'}
                                </>
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={handleCloseModal}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-500 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:opacity-40"
                            >
                                {isLoading ? 'Procesando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
