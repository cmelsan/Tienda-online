import { useState, useEffect } from 'react';

interface AddressData {
    fullName: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
}

interface AddressStepProps {
    user: any | null;
    onContinue: (address: AddressData) => void;
    onBack: () => void;
}

export default function AddressStep({ user, onContinue, onBack }: AddressStepProps) {
    const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState<AddressData>({
        fullName: '',
        street: '',
        city: '',
        postalCode: '',
        country: 'España',
        phone: ''
    });

    const [saveAddress, setSaveAddress] = useState(true);
    const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');

    useEffect(() => {
        if (user) {
            fetchAddresses();
        }
    }, [user]);

    const fetchAddresses = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/user/addresses');
            if (res.ok) {
                const { addresses } = await res.json();
                if (addresses && addresses.length > 0) {
                    setSavedAddresses(addresses);
                    // Select default or first
                    const defaultAddr = addresses.find((a: any) => a.is_default) || addresses[0];
                    setSelectedAddressId(defaultAddr.id);
                    setFormData(defaultAddr.address_data);
                }
            }
        } catch (err) {
            console.error('Error cargando direcciones:', err);
        }
        setLoading(false);
    };

    const handleAddressSelect = (id: string) => {
        setSelectedAddressId(id);
        if (id === 'new') {
            setFormData({
                fullName: '',
                street: '',
                city: '',
                postalCode: '',
                country: 'España',
                phone: ''
            });
        } else {
            const addr = savedAddresses.find(a => a.id === id);
            if (addr) setFormData(addr.address_data);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Save logic if new address and user wants to save
        if (user && selectedAddressId === 'new' && saveAddress) {
            try {
                const res = await fetch('/api/user/addresses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ addressData: formData }),
                });
                if (!res.ok) {
                    const { error } = await res.json();
                    console.error('Error saving address:', error);
                }
            } catch (err) {
                console.error('Error saving address:', err);
            }
        }

        onContinue(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Saved Addresses Selection */}
            {savedAddresses.length > 0 && (
                <div className="space-y-3 mb-6">
                    <p className="font-medium text-sm">Direcciones guardadas</p>
                    <div className="grid gap-3">
                        {savedAddresses.map((addr) => (
                            <div
                                key={addr.id}
                                onClick={() => handleAddressSelect(addr.id)}
                                className={`border p-4 rounded cursor-pointer transition-colors ${selectedAddressId === addr.id ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        checked={selectedAddressId === addr.id}
                                        readOnly
                                        className="text-black focus:ring-black"
                                    />
                                    <div className="text-sm">
                                        <p className="font-bold">
                                            {addr.address_data.fullName || addr.address_data.street || 'Dirección guardada'}
                                        </p>
                                        <p>
                                            {[addr.address_data.street, addr.address_data.city].filter(Boolean).join(', ')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* New Address Option */}
                        <div
                            onClick={() => handleAddressSelect('new')}
                            className={`border p-4 rounded cursor-pointer transition-colors ${selectedAddressId === 'new' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    checked={selectedAddressId === 'new'}
                                    readOnly
                                    className="text-black focus:ring-black"
                                />
                                <span className="text-sm font-medium">Usar una nueva dirección</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Address Form */}
            {selectedAddressId === 'new' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nombre Completo</label>
                            <input name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Teléfono</label>
                            <input name="phone" value={formData.phone} onChange={handleChange} required className="w-full border p-2 rounded" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Dirección</label>
                        <input name="street" value={formData.street} onChange={handleChange} required className="w-full border p-2 rounded" placeholder="Calle y número" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Código Postal</label>
                            <input name="postalCode" value={formData.postalCode} onChange={handleChange} required className="w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Ciudad</label>
                            <input name="city" value={formData.city} onChange={handleChange} required className="w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">País</label>
                            <input name="country" value={formData.country} onChange={handleChange} readOnly className="w-full border p-2 rounded bg-gray-50" />
                        </div>
                    </div>

                    {user && (
                        <div className="flex items-center gap-2 mt-4">
                            <input
                                type="checkbox"
                                id="saveAddress"
                                checked={saveAddress}
                                onChange={(e) => setSaveAddress(e.target.checked)}
                                className="text-black focus:ring-black rounded"
                            />
                            <label htmlFor="saveAddress" className="text-sm cursor-pointer">Guardar esta dirección para futuros pedidos</label>
                        </div>
                    )}
                </div>
            )}

            <div className="flex gap-4 pt-4">
                <button type="button" onClick={onBack} className="px-6 py-2 border rounded hover:bg-gray-50">
                    Atrás
                </button>
                <button type="submit" className="flex-1 bg-black text-white py-2 rounded font-medium hover:bg-gray-800">
                    Continuar al Pago
                </button>
            </div>
        </form>
    );
}
