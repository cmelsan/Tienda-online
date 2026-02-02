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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Solicitar Devolución</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                {/* Step 1: Instructions */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded p-4">
                            <h3 className="font-bold text-blue-900 mb-2">📦 Instrucciones de Envío</h3>
                            <p className="text-sm text-blue-800">
                                Debes enviar los artículos en su embalaje original a:
                            </p>
                            <div className="bg-white p-3 rounded mt-2 text-sm font-mono text-gray-700 border border-blue-100">
                                Calle de la Moda 123<br />
                                Polígono Industrial<br />
                                28001 Madrid, España
                            </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded p-4">
                            <h3 className="font-bold text-green-900 mb-2">✉️ Confirmación por Email</h3>
                            <p className="text-sm text-green-800">
                                Hemos enviado un correo con la etiqueta de devolución a tu dirección de email asociada.
                            </p>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            className="w-full bg-black text-white font-bold py-2 rounded hover:bg-gray-800 transition-colors"
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {/* Step 2: Disclaimer */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-300 rounded p-4">
                            <h3 className="font-bold text-yellow-900 mb-2">⚠️ Aviso Importante</h3>
                            <p className="text-sm text-yellow-800">
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
                                className="flex-1 bg-gray-200 text-gray-700 font-bold py-2 rounded hover:bg-gray-300 transition-colors"
                            >
                                Atrás
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 bg-black text-white font-bold py-2 rounded hover:bg-gray-800 transition-colors"
                            >
                                Entendido ✓
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
