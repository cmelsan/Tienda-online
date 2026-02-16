import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addNotification } from '@/stores/notifications';

interface AdminReturnRowProps {
    orderId: string;
    orderTotal: string;
    refundAmount?: string;
    orderStatus?: string; // 'return_requested', 'returned', 'partially_returned', 'refunded', 'partially_refunded'
}

export default function AdminReturnRow({ orderId, orderTotal, refundAmount, orderStatus = 'return_requested' }: AdminReturnRowProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [notes, setNotes] = useState('');
    const isRefundStage = orderStatus === 'returned' || orderStatus === 'partially_returned';
    const isRefunded = orderStatus === 'refunded' || orderStatus === 'partially_refunded';
    const displayRefundAmount = refundAmount || orderTotal;

    const handleProcessReturn = async (approved: boolean, restoreStock: boolean, action: string) => {
        const confirmMessage = approved
            ? `¿Aprobar devolución${restoreStock ? ' y restaurar stock' : ' sin restaurar stock'}?`
            : '¿Rechazar devolución y volver el pedido a "Entregado"?';

        if (!confirm(confirmMessage)) return;

        setIsProcessing(true);
        try {
            const { data, error } = await supabase.rpc('process_return', {
                p_order_id: orderId,
                p_approved: approved,
                p_restore_stock: restoreStock,
                p_notes: notes || action
            });

            if (error) throw error;

            if (data && data.success) {
                addNotification(`Devolución ${approved ? 'aprobada' : 'rechazada'} correctamente`, 'success');
                window.location.reload();
            } else {
                addNotification('Error: ' + (data?.message || 'No se pudo procesar'), 'error');
            }
        } catch (err: any) {
            console.error('Error processing return:', err);
            addNotification('Error de conexión', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleProcessRefund = async () => {
        if (!confirm(`¿Procesar reembolso de ${displayRefundAmount}? Esta acción marcará los productos como REEMBOLSADOS.`)) return;

        setIsProcessing(true);
        try {
            const { data, error } = await supabase.rpc('process_refund', {
                p_order_id: orderId
            });

            if (error) throw error;

            if (data && data.success) {
                addNotification('Reembolso procesado correctamente. En producción se ejecutaría el reembolso en Stripe.', 'success');
                window.location.reload();
            } else {
                addNotification('Error: ' + (data?.message || 'No se pudo procesar'), 'error');
            }
        } catch (err: any) {
            console.error('Error processing refund:', err);
            addNotification('Error de conexión', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-4">
            {isRefunded ? (
                <>
                    {/* REFUNDED: Show confirmation */}
                    <div className="bg-green-50 border border-green-200 rounded p-4">
                        <p className="text-sm font-semibold text-green-800">
                            Reembolso completado
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                            Cantidad reembolsada: <span className="font-bold">{displayRefundAmount}</span>
                            {displayRefundAmount !== orderTotal && (
                                <span className="text-gray-600 ml-1">(total pedido: {orderTotal})</span>
                            )}
                        </p>
                    </div>
                </>
            ) : isRefundStage ? (
                <>
                    {/* REFUND STAGE: Process Refund */}
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-3">
                            Devolución aprobada. Procesar reembolso de <span className="text-green-600">{displayRefundAmount}</span>
                            {displayRefundAmount !== orderTotal && (
                                <span className="text-xs text-gray-500 ml-1">(total pedido: {orderTotal})</span>
                            )}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleProcessRefund}
                            disabled={isProcessing}
                            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                            {isProcessing ? 'Procesando...' : 'Procesar Reembolso'}
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {/* RETURN REQUESTED STAGE: Approve/Reject Return */}
                    {/* Admin Notes */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                            Notas Administrativas (opcional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none resize-none rounded"
                            rows={2}
                            placeholder="Añade comentarios sobre esta devolución..."
                            disabled={isProcessing}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleProcessReturn(true, true, 'Devolución aprobada y stock restaurado')}
                            disabled={isProcessing}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                            {isProcessing ? 'Procesando...' : 'Aprobar y Restaurar Stock'}
                        </button>

                        <button
                            onClick={() => handleProcessReturn(true, false, 'Devolución aprobada sin restaurar stock')}
                            disabled={isProcessing}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                            {isProcessing ? 'Procesando...' : 'Aprobar sin Restaurar Stock'}
                        </button>

                        <button
                            onClick={() => handleProcessReturn(false, false, 'Devolución rechazada')}
                            disabled={isProcessing}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                            {isProcessing ? 'Procesando...' : 'Rechazar Devolución'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
