import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SettingsFormProps {
  token: string;
  offersEnabled: boolean;
}

export default function SettingsForm({ token: initialToken, offersEnabled: initialOffersEnabled }: SettingsFormProps) {
  const [offersEnabled, setOffersEnabled] = useState(initialOffersEnabled);
  const [flashSaleEnabled, setFlashSaleEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(initialToken);

  // If token is empty, try to get it from localStorage or fetch from server
  useEffect(() => {
    if (!token) {
      fetchToken();
    }
    fetchFlashSaleStatus();
  }, []);

  const fetchToken = async () => {
    // First try localStorage
    const storedToken = localStorage.getItem('admin-token');
    if (storedToken) {
      setToken(storedToken);
      console.log('[SettingsForm] Token loaded from localStorage');
      return;
    }

    // If not in localStorage, try to fetch from server
    try {
      const response = await fetch('/api/admin/me', {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && data.token) {
        setToken(data.token);
        // Save to localStorage for future use
        localStorage.setItem('admin-token', data.token);
        console.log('[SettingsForm] Token fetched from server and saved to localStorage');
      }
    } catch (error) {
      console.error('[SettingsForm] Error fetching token:', error);
    }
  };

  const fetchFlashSaleStatus = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'flash_sale_enabled')
        .single();
      
      if (data) {
        setFlashSaleEnabled(data.value === true);
      }
    } catch (error) {
      console.error('Error fetching flash sale status:', error);
    }
  };

  const handleToggleSetting = async (key: string, newState: boolean) => {
    setLoading(true);
    setMessage('');

    try {
      if (!token) {
        setMessage('Token no disponible. Por favor, recarga la página.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          key: key,
          value: newState,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar configuración');
      }

      if (key === 'offers_enabled') {
        setOffersEnabled(newState);
      } else if (key === 'flash_sale_enabled') {
        setFlashSaleEnabled(newState);
      }

      setMessage('Configuración actualizada correctamente.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('Error al guardar configuración.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOffers = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleToggleSetting('offers_enabled', e.target.checked);
  };

  const handleToggleFlashSale = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleToggleSetting('flash_sale_enabled', e.target.checked);
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

      <div class="bg-white border border-gray-200 shadow-sm">
        {/* Ofertas Setting */}
        <div class="flex items-center justify-between p-8 border-b border-gray-100">
          <div>
            <h3 class="text-sm font-bold text-black uppercase">Sección de Ofertas</h3>
            <p class="text-xs text-gray-500 mt-1 max-w-sm">Si se desactiva, la página de ofertas mostrará un error 404 y el enlace desaparecerá del menú principal.</p>
          </div>

          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={offersEnabled}
              onChange={handleToggleOffers}
              disabled={loading}
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
          </label>
        </div>

        {/* Flash Sale Setting */}
        <div class="flex items-center justify-between p-8">
          <div>
            <h3 class="text-sm font-bold text-black uppercase">⚡ Flash Sales en Inicio</h3>
            <p class="text-xs text-gray-500 mt-1 max-w-sm">Muestra la sección de Flash Sales en la página de inicio. Los productos se configuran en el Gestor de Flash Sales.</p>
          </div>

          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={flashSaleEnabled}
              onChange={handleToggleFlashSale}
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
