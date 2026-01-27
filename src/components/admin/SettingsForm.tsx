import { useState, useEffect } from 'react';

interface SettingsFormProps {
  offersEnabled: boolean;
}

export default function SettingsForm({ offersEnabled: initialOffersEnabled }: SettingsFormProps) {
  const [offersEnabled, setOffersEnabled] = useState(initialOffersEnabled);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newState = e.target.checked;
    setOffersEnabled(newState);
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'offers_enabled',
          value: newState,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar configuración');
      }

      setMessage('Configuración actualizada correctamente.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('Error al guardar configuración.');
      setOffersEnabled(!newState);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="max-w-2xl">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-black uppercase tracking-wider mb-2">Configuración de la Tienda</h1>
        <p class="text-xs text-gray-500 uppercase tracking-wide">Gestiona la visibilidad de secciones y parámetros globales.</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 border text-xs font-bold uppercase tracking-wide ${message.includes('Error') ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-green-50 border-green-200 text-green-600'}`}>
          {message}
        </div>
      )}

      <div class="bg-white border border-gray-200 p-8 shadow-sm">
        <div class="flex items-center justify-between pb-6 border-b border-gray-100">
          <div>
            <h3 class="text-sm font-bold text-black uppercase">Sección de Ofertas</h3>
            <p class="text-xs text-gray-500 mt-1 max-w-sm">Si se desactiva, la página de ofertas mostrará un error 404 y el enlace desaparecerá del menú principal.</p>
          </div>

          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={offersEnabled}
              onChange={handleToggle}
              disabled={loading}
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
