import { useState } from 'react';

interface ReturnModalClientProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    returnDeadline?: string | null;
}

export default function ReturnModalClient({
    isOpen,
    onClose,
    orderId,
    returnDeadline
}: ReturnModalClientProps) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [returnRequested, setReturnRequested] = useState(false);

    if (!isOpen) return null;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const daysRemaining = returnDeadline
        ? Math.ceil((new Date(returnDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const handleSubmitReturn = async () => {
        setIsSubmitting(true);
        try {
            console.log('[ReturnModalClient] Submitting return request:', { orderId });

            const response = await fetch('/api/orders/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    reason: 'Solicitud de devolución estándar'
                })
            });

            const data = await response.json();
            console.log('[ReturnModalClient] API Response:', { status: response.status, data });

            if (!response.ok || !data?.success) {
                console.error('[ReturnModalClient] Error response:', data);
                alert(`Error: ${data?.message || 'No se pudo procesar la solicitud'}`);
                return;
            }

            // Success
            setReturnRequested(true);
        } catch (err: any) {
            console.error('[ReturnModalClient] Exception:', err);
            alert('Error de conexión al solicitar la devolución');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        {returnRequested ? '✓ Devolución Solicitada' : 'Solicitar Devolución'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl"
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>

                {/* Success State */}
                {returnRequested && (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded p-4">
                            <h3 className="font-bold text-green-700 mb-2">¡Solicitud Aceptada!</h3>
                            <p className="text-sm text-green-700">
                                ✓ Hemos enviado un correo con la etiqueta de devolución a tu email asociado.
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-4">
                            <h3 className="font-bold text-blue-700 mb-2">Información de Reembolso</h3>
                            <p className="text-sm text-blue-700">
                                Una vez recibido y validado el paquete, el reembolso se procesará en tu método de pago original en un plazo de <strong>5 a 7 días hábiles</strong>.
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full bg-black text-white font-bold py-2 rounded hover:bg-gray-800 transition-colors text-sm"
                        >
                            Entendido
                        </button>
                    </div>
                )}

                {/* Step 1: Instructions */}
                {step === 1 && !returnRequested && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <h3 className="font-bold text-gray-900 mb-2">Instrucciones de Envío</h3>
                            <p className="text-sm text-gray-600 mb-2">
                                Debes enviar los artículos en su embalaje original a:
                            </p>
                            <div className="bg-white p-3 rounded text-sm text-gray-700 border border-gray-100 font-medium">
                                Calle de la Moda 123<br />
                                Polígono Industrial<br />
                                28001 Madrid, España
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <h3 className="font-bold text-gray-900 mb-2">Confirmación por Email</h3>
                            <p className="text-sm text-gray-600">
                                Se ha enviado una etiqueta de devolución a tu dirección de email asociada.
                            </p>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            className="w-full bg-black text-white font-bold py-2 rounded hover:bg-gray-800 transition-colors text-sm"
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {/* Step 2: Disclaimer & Submit */}
                {step === 2 && !returnRequested && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <h3 className="font-bold text-gray-900 mb-2">Información de Reembolso</h3>
                            <p className="text-sm text-gray-600">
                                Una vez recibido y validado el paquete, el reembolso se procesará en tu método de pago original en un plazo de 5 a 7 días hábiles.
                            </p>
                        </div>

                        {daysRemaining !== null && (
                            <div className="bg-gray-50 border border-gray-200 rounded p-4">
                                <p className="text-sm text-gray-700">
                                    <strong>Plazo de devolución:</strong> {daysRemaining} días restantes
                                    {returnDeadline && (
                                        <>
                                            <br />
                                            Vence el {formatDate(returnDeadline)}
                                        </>
                                    )}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 border border-gray-300 text-gray-900 font-bold py-2 rounded hover:bg-gray-50 transition-colors text-sm"
                                disabled={isSubmitting}
                            >
                                Atrás
                            </button>
                            <button
                                onClick={handleSubmitReturn}
                                disabled={isSubmitting}
                                className="flex-1 bg-black text-white font-bold py-2 rounded hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
                            >
                                {isSubmitting ? 'Procesando...' : 'Entendido'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
