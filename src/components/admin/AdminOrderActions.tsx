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
    refund: '/api/admin/process-return' // Same endpoint, different params
};

const STATUS_COLORS: Record<string, string> = {
    awaiting_payment: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    paid: 'bg-green-50 text-green-700 border-green-200',
    shipped: 'bg-blue-50 text-blue-700 border-blue-200',
    delivered: 'bg-purple-50 text-purple-700 border-purple-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    return_requested: 'bg-orange-50 text-orange-700 border-orange-200',
    returned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    refunded: 'bg-gray-50 text-gray-700 border-gray-200',
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
            variant: 'danger' | 'warning' | 'success' | 'info';
            requiresNotes?: boolean;
            requiresConfirm?: boolean;
            showRestoreStock?: boolean;
        }> = [];

        switch (order.status) {
            case 'awaiting_payment':
                // Can't do much, just view
                break;
            case 'paid':
                actions.push({
                    type: 'ship',
                    label: '📦 Marcar Enviado',
                    variant: 'success',
                    requiresConfirm: true
                });
                actions.push({
                    type: 'cancel',
                    label: '❌ Cancelar Pedido',
                    variant: 'danger',
                    requiresNotes: true,
                    requiresConfirm: true
                });
                break;
            case 'shipped':
                actions.push({
                    type: 'deliver',
                    label: '✓ Marcar Entregado',
                    variant: 'success',
                    requiresConfirm: true
                });
                break;
            case 'delivered':
                // View returns section
                break;
            case 'return_requested':
                actions.push({
                    type: 'process_return',
                    label: '✓ Aceptar Devolución',
                    variant: 'success',
                    requiresNotes: false,
                    requiresConfirm: true,
                    showRestoreStock: true
                });
                actions.push({
                    type: 'refund',
                    label: '💰 Reembolsar',
                    variant: 'info',
                    requiresNotes: true,
                    requiresConfirm: true
                });
                break;
            case 'returned':
                actions.push({
                    type: 'refund',
                    label: '💰 Reembolsar',
                    variant: 'success',
                    requiresNotes: true,
                    requiresConfirm: true
                });
                break;
            // cancelled, refunded: No actions
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

            // Build payload based on action type
            switch (action) {
                case 'process_return':
                    // Aceptar devolución: devolver status 'returned'
                    payload.newStatus = 'returned';
                    payload.restoreStock = restoreStock;
                    break;
                case 'refund':
                    // Reembolsar: cambiar status a 'refunded'
                    payload.newStatus = 'refunded';
                    payload.restoreStock = false; // No restaurar stock en reembolso
                    break;
                // cancel, ship, deliver: no need extra params
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

            // Success
            setShowModal(false);
            setNotes('');
            setRestoreStock(false);
            
            // Notify parent
            if (onActionComplete && data.data?.new_status) {
                onActionComplete(data.data.new_status);
            }

            alert(`✅ ${data.data?.message || 'Acción completada'}`);
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

    return (
        <div className="flex flex-wrap gap-2">
            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[order.status] || STATUS_COLORS.awaiting_payment}`}>
                {STATUS_LABELS[order.status] || order.status}
            </div>

            {/* Action Buttons */}
            {availableActions.map(action => (
                <button
                    key={action.type}
                    onClick={() => handleActionClick(action.type, action.requiresConfirm || action.requiresNotes || false)}
                    disabled={isLoading}
                    className={`
                        px-3 py-1 rounded text-sm font-medium 
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${action.variant === 'danger' ? 'bg-red-100 hover:bg-red-200 text-red-700' : ''}
                        ${action.variant === 'success' ? 'bg-green-100 hover:bg-green-200 text-green-700' : ''}
                        ${action.variant === 'warning' ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700' : ''}
                        ${action.variant === 'info' ? 'bg-blue-100 hover:bg-blue-200 text-blue-700' : ''}
                    `}
                >
                    {isLoading && modalAction === action.type ? '⏳...' : action.label}
                </button>
            ))}

            {/* Modal */}
            {showModal && currentAction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
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
                        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
                            {modalAction === 'ship' && '¿Marcar este pedido como enviado?'}
                            {modalAction === 'deliver' && '¿Marcar este pedido como entregado? Se calculará el plazo de devolución (14 días).'}
                            {modalAction === 'cancel' && '⚠️ ¿Cancelar este pedido y restaurar stock? Esta acción no se puede deshacer.'}
                            {modalAction === 'process_return' && '¿Aceptar esta devolución?'}
                            {modalAction === 'refund' && '¿Procesar el reembolso? El dinero se enviará al método de pago original.'}
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleCloseModal}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isLoading}
                                className={`
                                    flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors
                                    ${currentAction.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
                                    ${currentAction.variant === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
                                    ${currentAction.variant === 'info' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            >
                                {isLoading ? '⏳...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
