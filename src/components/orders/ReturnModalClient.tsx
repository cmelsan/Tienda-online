import { useState } from 'react';
import { addNotification } from '@/stores/notifications';

interface OrderItem {
    id: string;
    quantity: number;
    price_at_purchase: number;
    return_status?: string | null;
    product: {
        name: string;
        images?: string[];
        slug?: string;
    };
}

interface ReturnModalClientProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    returnDeadline?: string | null;
    items: OrderItem[];
}

export default function ReturnModalClient({
    isOpen,
    onClose,
    orderId,
    returnDeadline,
    items
}: ReturnModalClientProps) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [returnRequested, setReturnRequested] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    // Solo mostrar items que se pueden devolver (sin devolución activa)
    const returnableItems = items.filter(
      item => !item.return_status || item.return_status === 'rejected'
    );

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount / 100);
    };

    const daysRemaining = returnDeadline
        ? Math.ceil((new Date(returnDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const toggleItem = (itemId: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(itemId)) {
            newSet.delete(itemId);
        } else {
            newSet.add(itemId);
        }
        setSelectedItems(newSet);
    };

    const selectAll = () => {
        if (selectedItems.size === returnableItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(returnableItems.map(i => i.id)));
        }
    };

    const refundTotal = returnableItems
        .filter(i => selectedItems.has(i.id))
        .reduce((sum, item) => sum + (item.price_at_purchase * item.quantity), 0);

    const handleSubmitReturn = async () => {
        if (selectedItems.size === 0) {
            addNotification('Selecciona al menos un producto para devolver', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const itemIds = Array.from(selectedItems);
            const finalReason = reason.trim() || 'Solicitud de devolución estándar';

            const response = await fetch('/api/orders/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    reason: finalReason,
                    itemIds
                })
            });

            const data = await response.json();

            if (!response.ok || !data?.success) {
                addNotification(`Error: ${data?.message || 'No se pudo procesar la solicitud'}`, 'error');
                return;
            }

            setReturnRequested(true);
        } catch (err: any) {
            addNotification('Error de conexión al solicitar la devolución', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (returnRequested) {
            window.location.reload();
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-gray-100 z-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">
                            {returnRequested ? 'Devoluci\u00f3n Solicitada' : 'Solicitar Devoluci\u00f3n'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 text-xl"
                            disabled={isSubmitting}
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="px-6 pb-6">
                    {/* Success State */}
                    {returnRequested && (
                        <div className="space-y-4 pt-4">
                            <div className="bg-green-50 border border-green-200 rounded p-4">
                                <h3 className="font-bold text-green-700 mb-2">¡Solicitud Aceptada!</h3>
                                <p className="text-sm text-green-700">
                                    Hemos recibido tu solicitud de devoluci\u00f3n para {selectedItems.size} producto(s).
                                </p>
                                <p className="text-sm text-green-700 mt-1">
                                    Reembolso estimado: <strong>{formatPrice(refundTotal)}</strong>
                                </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded p-4">
                                <h3 className="font-bold text-blue-700 mb-2">Información de Reembolso</h3>
                                <p className="text-sm text-blue-700">
                                    Una vez recibido y validado el paquete, el reembolso se procesará en tu método de pago original en un plazo de <strong>5 a 7 días hábiles</strong>.
                                </p>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full bg-black text-white font-bold py-2 rounded hover:bg-gray-800 transition-colors text-sm"
                            >
                                Entendido
                            </button>
                        </div>
                    )}

                    {/* Step 1: Select Products */}
                    {step === 1 && !returnRequested && (
                        <div className="space-y-4 pt-4">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-gray-900 text-sm">Selecciona los productos a devolver</h3>
                                    <button
                                        onClick={selectAll}
                                        className="text-xs text-gray-500 hover:text-black underline"
                                    >
                                        {selectedItems.size === returnableItems.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {returnableItems.map((item) => {
                                        const isSelected = selectedItems.has(item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => toggleItem(item.id)}
                                                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'border-black bg-gray-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                {/* Checkbox */}
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                    isSelected ? 'bg-black border-black' : 'border-gray-300'
                                                }`}>
                                                    {isSelected && (
                                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>

                                                {/* Imagen */}
                                                <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                                    {item.product?.images?.[0] ? (
                                                        <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name}</p>
                                                    <p className="text-xs text-gray-500">Cantidad: {item.quantity}</p>
                                                </div>

                                                {/* Precio */}
                                                <div className="text-sm font-bold text-gray-900">
                                                    {formatPrice(item.price_at_purchase * item.quantity)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {returnableItems.length === 0 && (
                                    <div className="text-center py-6 text-gray-500 text-sm">
                                        No hay productos disponibles para devolver.
                                    </div>
                                )}
                            </div>

                            {/* Motivo */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                                    Motivo de la devolución (opcional)
                                </label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-black focus:outline-none"
                                >
                                    <option value="">Seleccionar motivo...</option>
                                    <option value="No me gusta el producto">No me gusta el producto</option>
                                    <option value="Producto dañado">Producto dañado</option>
                                    <option value="Producto incorrecto">Producto incorrecto</option>
                                    <option value="No es lo que esperaba">No es lo que esperaba</option>
                                    <option value="Talla/tamaño incorrecto">Talla/tamaño incorrecto</option>
                                    <option value="Otro motivo">Otro motivo</option>
                                </select>
                            </div>

                            {/* Resumen */}
                            {selectedItems.size > 0 && (
                                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">{selectedItems.size} producto(s) seleccionado(s)</span>
                                        <span className="font-bold text-gray-900">Reembolso: {formatPrice(refundTotal)}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setStep(2)}
                                disabled={selectedItems.size === 0}
                                className="w-full bg-black text-white font-bold py-2 rounded hover:bg-gray-800 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Continuar
                            </button>
                        </div>
                    )}

                    {/* Step 2: Confirm */}
                    {step === 2 && !returnRequested && (
                        <div className="space-y-4 pt-4">
                            <div className="bg-gray-50 border border-gray-200 rounded p-4">
                                <h3 className="font-bold text-gray-900 mb-2">Instrucciones de Envío</h3>
                                <p className="text-sm text-gray-600 mb-2">
                                    Debes enviar los artículos seleccionados en su embalaje original a:
                                </p>
                                <div className="bg-white p-3 rounded text-sm text-gray-700 border border-gray-100 font-medium">
                                    Calle de la Moda 123<br />
                                    Polígono Industrial<br />
                                    28001 Madrid, España
                                </div>
                            </div>

                            {/* Resumen de productos */}
                            <div className="bg-gray-50 border border-gray-200 rounded p-4">
                                <h3 className="font-bold text-gray-900 mb-2">Productos a devolver</h3>
                                <div className="space-y-2">
                                    {returnableItems.filter(i => selectedItems.has(i.id)).map(item => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span className="text-gray-700 truncate flex-1">{item.product?.name} (x{item.quantity})</span>
                                            <span className="font-medium text-gray-900 ml-2">{formatPrice(item.price_at_purchase * item.quantity)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-sm">
                                        <span>Reembolso estimado</span>
                                        <span>{formatPrice(refundTotal)}</span>
                                    </div>
                                </div>
                            </div>

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
                                    {isSubmitting ? 'Procesando...' : 'Confirmar Devolución'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
