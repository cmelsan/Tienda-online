import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    onReturnRequested: () => void;
}

const returnReasons = [
    { value: 'damaged', label: 'Producto dañado o defectuoso' },
    { value: 'wrong_product', label: 'Producto incorrecto' },
    { value: 'not_as_described', label: 'No coincide con la descripción' },
    { value: 'changed_mind', label: 'Cambié de opinión' },
    { value: 'other', label: 'Otro motivo' },
];

export default function ReturnModal({ isOpen, onClose, orderId, onReturnRequested }: ReturnModalProps) {
    const [selectedReason, setSelectedReason] = useState('');
    const [additionalDetails, setAdditionalDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [returnRequested, setReturnRequested] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedReason) {
            alert('Por favor selecciona un motivo de devolución');
            return;
        }

        setIsSubmitting(true);
        try {
            const reasonText = returnReasons.find(r => r.value === selectedReason)?.label || selectedReason;
            const fullReason = additionalDetails
                ? `${reasonText}: ${additionalDetails}`
                : reasonText;

            // 1. Request return via RPC
            const response = await fetch('/api/orders/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    reason: fullReason
                })
            });

            const data = await response.json();

            if (!data || !data.success) {
                alert('Error: ' + (data?.message || 'No se pudo procesar la solicitud'));
                return;
            }

            // 2. Get user email for email notification
            const { data: { user } } = await supabase.auth.getUser();
            const customerEmail = user?.email || '';
            const customerName = user?.user_metadata?.full_name || 'Cliente';

            // 3. Send return confirmation email
            if (customerEmail) {
                const emailResponse = await fetch('/api/emails/return-initiated', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId,
                        customerEmail,
                        customerName,
                        returnReason: fullReason
                    })
                });

                const emailData = await emailResponse.json();
                if (!emailData.success) {
                    console.error('Email sending failed:', emailData.error);
                    // Don't fail the return if email fails
                }
            }

            setReturnRequested(true);
        } catch (err: any) {
            console.error('Error requesting return:', err);
            alert('Error de conexión al solicitar la devolución');
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadLabel = async () => {
        try {
            const response = await fetch('/api/orders/generate-return-label', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });

            const data = await response.json();

            if (data.success && data.label) {
                // Decode base64 and create blob
                const binaryString = atob(data.label);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'text/html' });

                // Create download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = data.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Error al descargar la etiqueta');
            }
        } catch (err: any) {
            console.error('Error downloading label:', err);
            alert('Error al descargar la etiqueta');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-2xl w-full p-8 rounded-none shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-bold uppercase tracking-wider">
                        {returnRequested ? '✓ Devolución Solicitada' : 'Solicitar Devolución'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-black text-2xl leading-none"
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>

                {returnRequested ? (
                    // Success State
                    <div className="space-y-6">
                        <div className="bg-green-50 border-2 border-green-200 p-6 rounded">
                            <h3 className="text-lg font-bold text-green-700 mb-3">¡Solicitud Aceptada!</h3>
                            <p className="text-green-700 text-sm mb-4">
                                Tu solicitud de devolución ha sido procesada correctamente. 
                                <strong> Hemos enviado un correo a tu email </strong> con toda la información necesaria.
                            </p>
                        </div>

                        <div className="bg-blue-50 border-l-4 border-blue-600 p-6">
                            <h4 className="font-bold uppercase text-xs mb-3 text-blue-900">📧 Próximos Pasos</h4>
                            <ol className="space-y-3 text-sm text-blue-900">
                                <li><strong>1. Recibe el email:</strong> En tu bandeja encontrarás las instrucciones completas</li>
                                <li><strong>2. Descarga la etiqueta:</strong> Obtén la etiqueta de devolución desde el botón abajo</li>
                                <li><strong>3. Empaqueta:</strong> Coloca los productos en su embalaje original</li>
                                <li><strong>4. Envía:</strong> Utiliza cualquier servicio de correos con la dirección de la etiqueta</li>
                                <li><strong>5. Reembolso:</strong> Recibirás el dinero en 5-7 días hábiles tras validar el paquete</li>
                            </ol>
                        </div>

                        <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded">
                            <p className="text-xs text-yellow-800">
                                <strong>⏱️ Plazo máximo:</strong> Tienes 14 días desde hoy para enviar el paquete. 
                                Guarda el número de seguimiento de tu envío.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={downloadLabel}
                                className="flex-1 bg-black text-white py-4 px-6 text-sm font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors"
                            >
                                📥 Descargar Etiqueta de Devolución
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 bg-gray-200 text-black py-4 px-6 text-sm font-bold uppercase tracking-widest hover:bg-gray-300 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>

                        <div className="text-xs text-gray-600 text-center">
                            <p>¿Necesitas ayuda? Contacta con <strong>soporte@eclatbeauty.com</strong></p>
                        </div>
                    </div>
                ) : (
                    // Form State
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Reason Selection */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                                Motivo de la devolución *
                            </label>
                            <select
                                value={selectedReason}
                                onChange={(e) => setSelectedReason(e.target.value)}
                                className="w-full border border-gray-300 px-4 py-3 text-sm focus:border-black focus:outline-none"
                                required
                                disabled={isSubmitting}
                            >
                                <option value="">Selecciona un motivo</option>
                                {returnReasons.map((reason) => (
                                    <option key={reason.value} value={reason.value}>
                                        {reason.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Additional Details */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                                Detalles adicionales (opcional)
                            </label>
                            <textarea
                                value={additionalDetails}
                                onChange={(e) => setAdditionalDetails(e.target.value)}
                                className="w-full border border-gray-300 px-4 py-3 text-sm focus:border-black focus:outline-none resize-none"
                                rows={4}
                                placeholder="Proporciona más información sobre el motivo de la devolución..."
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Return Policy */}
                        <div className="bg-gray-50 p-4 border-l-4 border-black">
                            <h3 className="font-bold uppercase tracking-wider text-xs mb-3">Política de Devoluciones</h3>
                            <ul className="space-y-2 text-xs text-gray-700">
                                <li>✓ Tienes <strong>30 días</strong> desde la fecha de entrega para solicitar una devolución</li>
                                <li>✓ Debes enviar los artículos en su embalaje original a: <strong>Calle de la Moda 123, Polígono Industrial, Madrid</strong></li>
                                <li>✓ Recibirás un correo con la <strong>etiqueta de devolución</strong> a tu email asociado</li>
                                <li>✓ <strong>Aviso Importante:</strong> Una vez recibido y validado el paquete, el reembolso se procesará en tu método de pago original en un plazo de <strong>5 a 7 días hábiles</strong></li>
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting || !selectedReason}
                                className="flex-1 bg-black text-white py-4 px-6 text-sm font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Procesando...' : 'Confirmar Solicitud'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 bg-gray-200 text-black py-4 px-6 text-sm font-bold uppercase tracking-widest hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
