import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AttributesManageProps {
  token: string;
  categories: any[];
  subcategories: any[];
  brands: any[];
}

export default function AttributesManage({ token: initialToken, categories, subcategories, brands: initialBrands }: AttributesManageProps) {
  const [activeTab, setActiveTab] = useState('subcategories');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subs, setSubs] = useState(subcategories);
  const [brandsList, setBrandsList] = useState(initialBrands);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [token, setToken] = useState(initialToken);

  // If token is empty, try to get it from localStorage or fetch from server
  useEffect(() => {
    if (!token) {
      fetchToken();
    }
  }, []);

  const fetchToken = async () => {
    // First try localStorage
    const storedToken = localStorage.getItem('admin-token');
    if (storedToken) {
      setToken(storedToken);
      console.log('[AttributesManage] Token loaded from localStorage');
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
        console.log('[AttributesManage] Token fetched from server and saved to localStorage');
      }
    } catch (error) {
      console.error('[AttributesManage] Error fetching token:', error);
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName || !newSubCategory) return;

    setIsSubmitting(true);
    try {
      if (!token) {
        alert('Token no disponible. Por favor, recarga la página.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_subcategory',
          category_id: newSubCategory,
          name: newSubName,
        })
      });

      const data = await response.json();
      if (data.success) {
        setSubs([...subs, data.subcategory]);
        setNewSubName('');
      } else {
        alert('Error: ' + (data.error || data.message));
      }
    } catch (error: any) {
      alert('Error al crear subcategoría: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar esta subcategoría?')) return;

    setIsSubmitting(true);
    try {
      if (!token) {
        alert('Token no disponible. Por favor, recarga la página.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'delete_subcategory',
          id,
        })
      });

      const data = await response.json();
      if (data.success) {
        setSubs(subs.filter(s => s.id !== id));
      } else {
        alert('Error: ' + (data.error || data.message));
      }
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName) return;

    setIsSubmitting(true);
    try {
      if (!token) {
        alert('Token no disponible. Por favor, recarga la página.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create_brand',
          name: newBrandName,
        })
      });

      const data = await response.json();
      if (data.success) {
        setBrandsList([...brandsList, data.brand]);
        setNewBrandName('');
      } else {
        alert('Error: ' + (data.error || data.message));
      }
    } catch (error: any) {
      alert('Error al crear marca: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm('¿Seguro?')) return;

    setIsSubmitting(true);
    try {
      if (!token) {
        alert('Token no disponible. Por favor, recarga la página.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'delete_brand',
          id,
        })
      });

      const data = await response.json();
      if (data.success) {
        setBrandsList(brandsList.filter(b => b.id !== id));
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      alert('Error al eliminar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubs = selectedCategory === 'all' 
    ? subs 
    : subs.filter(s => s.category_id === selectedCategory);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Gestión de Atributos</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button 
            onClick={() => setActiveTab('subcategories')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'subcategories' 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Subcategorías
          </button>
          <button 
            onClick={() => setActiveTab('brands')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'brands' 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Marcas
          </button>
        </nav>
      </div>

      {/* SUBCATEGORIES SECTION */}
      {activeTab === 'subcategories' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <label className="text-sm font-bold text-gray-700">Filtrar por Categoría:</label>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md border border-gray-300 shadow-sm focus:border-black focus:ring-black px-3 py-2"
              >
                <option value="all">Todas</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            {/* Add Subcategory Form */}
            <form onSubmit={handleAddSubcategory} className="flex gap-2">
              <select 
                value={newSubCategory}
                onChange={(e) => setNewSubCategory(e.target.value)}
                required 
                className="rounded-md border border-gray-300 shadow-sm text-sm px-3 py-2"
              >
                <option value="">Selecciona Categoría Padre</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <input 
                type="text" 
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="Nueva Subcategoría (ej. Rostro)" 
                required 
                className="rounded-md border border-gray-300 shadow-sm text-sm w-64 px-3 py-2"
              />
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-black text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Añadiendo...' : '+ Añadir'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría Padre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubs?.map(sub => (
                  <tr key={sub.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sub.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {sub.category?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">{sub.slug}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleDeleteSubcategory(sub.id)}
                        disabled={isSubmitting}
                        className="text-red-600 hover:text-red-900 font-bold disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BRANDS SECTION */}
      {activeTab === 'brands' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold">Listado de Marcas</h2>
            
            {/* Add Brand Form */}
            <form onSubmit={handleAddBrand} className="flex gap-2">
              <input 
                type="text" 
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Nombre de la Nueva Marca" 
                required 
                className="rounded-md border border-gray-300 shadow-sm text-sm w-64 px-3 py-2"
              />
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-black text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Añadiendo...' : '+ Añadir Marca'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {brandsList?.map(brand => (
              <div key={brand.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center group hover:border-black transition-colors">
                <span className="font-bold text-sm truncate">{brand.name}</span>
                <button 
                  onClick={() => handleDeleteBrand(brand.id)}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
