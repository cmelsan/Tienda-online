import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AdminReturnRowProps {
    orderId: string;
    orderTotal: string;
}

export default function AdminReturnRow({ orderId, orderTotal }: AdminReturnRowProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [notes, setNotes] = useState('');

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
                alert(`Devolución ${approved ? 'aprobada' : 'rechazada'} correctamente`);
                window.location.reload();
            } else {
                alert('Error: ' + (data?.message || 'No se pudo procesar'));
            }
        } catch (err: any) {
            console.error('Error processing return:', err);
            alert('Error de conexión');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleProcessRefund = async () => {
        if (!confirm(`¿Procesar reembolso de ${orderTotal}? Esta acción marcará el pedido como REEMBOLSADO.`)) return;

        setIsProcessing(true);
        try {
            const { data, error } = await supabase.rpc('process_refund', {
                p_order_id: orderId
            });

            if (error) throw error;

            if (data && data.success) {
                alert('Reembolso procesado correctamente. En producción se ejecutaría el reembolso en Stripe.');
                window.location.reload();
            } else {
                alert('Error: ' + (data?.message || 'No se pudo procesar'));
            }
        } catch (err: any) {
            console.error('Error processing refund:', err);
            alert('Error de conexión');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-4">
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
                    {isProcessing ? 'Procesando...' : '✓ Aprobar y Restaurar Stock'}
                </button>

                <button
                    onClick={() => handleProcessReturn(true, false, 'Devolución aprobada sin restaurar stock')}
                    disabled={isProcessing}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                >
                    {isProcessing ? 'Procesando...' : '✓ Aprobar sin Restaurar Stock'}
                </button>

                <button
                    onClick={() => handleProcessReturn(false, false, 'Devolución rechazada')}
                    disabled={isProcessing}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                >
                    {isProcessing ? 'Procesando...' : '✗ Rechazar Devolución'}
                </button>
            </div>
        </div>
    );
}
