import { useState, useCallback, useMemo } from 'react';

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
    refund: '/api/admin/process-return'
};

const STATUS_LABELS: Record<string, string> = {
    awaiting_payment: 'Esperando Pago',
    paid: 'Pagado',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    return_requested: 'Devolución Solicitada',
    returned: 'Devuelto',
    refunded: 'Reembolsado',
    partially_returned: 'Parcialmente Devuelto',
};

export default function AdminOrderActions({ order, onActionComplete }: AdminOrderActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalAction, setModalAction] = useState<ActionType | null>(null);
    const [notes, setNotes] = useState('');
    const [restoreStock, setRestoreStock] = useState(false);
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
                    payload.newStatus = 'refunded';
                    payload.restoreStock = false;
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

            alert(data.data?.message || 'Acción completada exitosamente');
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
        setError(null);
    };

    const currentAction = availableActions.find(a => a.type === modalAction);

    if (availableActions.length === 0) {
        return <span className="text-xs text-gray-400">-</span>;
    }

    return (
        <div className="flex gap-2">
            {/* Action Buttons - Inline like coupons */}
            {availableActions.map(action => (
                <button
                    key={action.type}
                    onClick={() => handleActionClick(action.type, action.requiresConfirm || action.requiresNotes || false)}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                >
                    {isLoading && modalAction === action.type ? 'Procesando...' : action.label}
                </button>
            ))}
            
            {/* Modal */}
            {showModal && currentAction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-6 text-gray-900">
                            {currentAction.label}
                        </h3>

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
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                                    rows={3}
                                />
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
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Confirmation Message */}
                        <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded text-gray-700 text-sm">
                            {modalAction === 'ship' && 'Marcar este pedido como enviado.'}
                            {modalAction === 'deliver' && 'Marcar este pedido como entregado. Se calculará el plazo de devolución (14 días).'}
                            {modalAction === 'cancel' && 'Cancelar este pedido y restaurar stock. Esta acción no se puede deshacer.'}
                            {modalAction === 'process_return' && 'Aceptar esta devolución del cliente.'}
                            {modalAction === 'refund' && 'Procesar el reembolso. El dinero se enviará al método de pago original.'}
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleCloseModal}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-black text-white rounded font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
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
