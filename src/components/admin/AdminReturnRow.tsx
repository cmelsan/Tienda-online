import { useState } from 'react';
import { addNotification } from '@/stores/notifications';

interface AdminReturnRowProps {
    orderId: string;
    orderTotalCents: number;
    refundAmountCents: number;
    orderStatus?: string;
}

function formatPrice(cents: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default function AdminReturnRow({ orderId, orderTotalCents, refundAmountCents, orderStatus = 'return_requested' }: AdminReturnRowProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [notes, setNotes] = useState('');
    const [confirmAction, setConfirmAction] = useState<null | 'approve_stock' | 'approve_no_stock' | 'reject' | 'refund'>(null);

    const isRefundStage = orderStatus === 'returned' || orderStatus === 'partially_returned';
    const isRefunded = orderStatus === 'refunded' || orderStatus === 'partially_refunded';
    const isPartialReturn = refundAmountCents < orderTotalCents;

    const handleProcessReturn = async (approved: boolean, restoreStock: boolean) => {
        setIsProcessing(true);
        setConfirmAction(null);
        try {
            const res = await fetch('/api/admin/process-return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    newStatus: approved ? 'returned' : 'delivered',
                    restoreStock,
                    notes: notes || (approved
                        ? restoreStock ? 'Devolución aprobada y stock restaurado' : 'Devolución aprobada sin restaurar stock'
                        : 'Devolución rechazada')
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                addNotification(`Devolución ${approved ? 'aprobada' : 'rechazada'} correctamente`, 'success');
                setTimeout(() => window.location.reload(), 600);
            } else {
                addNotification(data.message || 'Error al procesar la devolución', 'error');
            }
        } catch (err: any) {
            addNotification('Error de conexión: ' + err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleProcessRefund = async () => {
        setIsProcessing(true);
        setConfirmAction(null);
        try {
            const body: any = { orderId, notes: notes || undefined };
            // Si es parcial enviamos el monto en euros (el API convierte a céntimos)
            if (isPartialReturn) {
                body.refundAmount = refundAmountCents / 100;
            }
            const res = await fetch('/api/admin/process-refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                addNotification('Reembolso procesado correctamente en Stripe', 'success');
                setTimeout(() => window.location.reload(), 600);
            } else {
                addNotification(data.message || 'Error al procesar el reembolso', 'error');
            }
        } catch (err: any) {
            addNotification('Error de conexión: ' + err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Confirm modal inline
    const ConfirmModal = ({ action }: { action: NonNullable<typeof confirmAction> }) => {
        const messages: Record<typeof action, string> = {
            approve_stock: `¿Aprobar devolución y restaurar stock?`,
            approve_no_stock: `¿Aprobar devolución sin restaurar stock?`,
            reject: `¿Rechazar devolución? El pedido volverá a estado "Entregado".`,
            refund: `¿Procesar reembolso de ${formatPrice(refundAmountCents)} en Stripe? Esta acción no se puede deshacer.`,
        };
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                <div className="bg-white shadow-2xl p-8 max-w-sm w-full mx-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-black">Confirmar acción</h3>
                        <div className="w-6 h-0.5 bg-pink-500"></div>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">{messages[action]}</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setConfirmAction(null)}
                            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-500 text-xs font-bold uppercase tracking-widest hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                if (action === 'approve_stock') handleProcessReturn(true, true);
                                else if (action === 'approve_no_stock') handleProcessReturn(true, false);
                                else if (action === 'reject') handleProcessReturn(false, false);
                                else if (action === 'refund') handleProcessRefund();
                            }}
                            className="flex-1 px-4 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-900"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {confirmAction && <ConfirmModal action={confirmAction} />}

            {isRefunded ? (
                <div className="bg-gray-50 border border-gray-200 p-4">
                    <p className="text-sm font-bold uppercase tracking-wider text-black">Reembolso completado</p>
                    <p className="text-xs text-gray-600 mt-1">
                        Cantidad reembolsada: <span className="font-bold text-black">{formatPrice(refundAmountCents)}</span>
                        {isPartialReturn && <span className="text-gray-500 ml-1">(total pedido: {formatPrice(orderTotalCents)})</span>}
                    </p>
                </div>
            ) : isRefundStage ? (
                <>
                    <p className="text-sm font-bold text-black uppercase tracking-wider">
                        Devolución aprobada — procesar reembolso de{' '}
                        <span className="text-pink-500">{formatPrice(refundAmountCents)}</span>
                        {isPartialReturn && <span className="text-xs text-gray-500 ml-2 lowercase font-normal">(total pedido: {formatPrice(orderTotalCents)})</span>}
                    </p>
                    <button
                        onClick={() => setConfirmAction('refund')}
                        disabled={isProcessing}
                        className="w-full bg-black hover:bg-pink-500 text-white px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                    >
                        {isProcessing ? 'Procesando...' : 'Procesar Reembolso'}
                    </button>
                </>
            ) : (
                <>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Notas (opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none resize-none"
                            rows={2}
                            placeholder="Añade comentarios sobre esta devolución..."
                            disabled={isProcessing}
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setConfirmAction('approve_stock')}
                            disabled={isProcessing}
                            className="flex-1 bg-black hover:bg-pink-500 text-white px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                            {isProcessing ? 'Procesando...' : 'Aprobar + Stock'}
                        </button>
                        <button
                            onClick={() => setConfirmAction('approve_no_stock')}
                            disabled={isProcessing}
                            className="flex-1 bg-gray-700 hover:bg-gray-900 text-white px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                            {isProcessing ? 'Procesando...' : 'Aprobar sin Stock'}
                        </button>
                        <button
                            onClick={() => setConfirmAction('reject')}
                            disabled={isProcessing}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                            {isProcessing ? 'Procesando...' : 'Rechazar'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
