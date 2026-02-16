import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addNotification } from '@/stores/notifications';

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

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName || !newSubCategory) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
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
        setNewSubCategory('');
      } else {
        addNotification('Error: ' + (data.error || data.message), 'error');
      }
    } catch (error: any) {
      addNotification('Error al crear subcategoía: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar esta subcategoría?')) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
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
        addNotification('Error: ' + (data.error || data.message), 'error');
      }
    } catch (error: any) {
      addNotification('Error al eliminar: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
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
        addNotification('Error: ' + (data.error || data.message), 'error');
      }
    } catch (error: any) {
      addNotification('Error al crear marca: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm('¿Seguro?')) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
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
        addNotification('Error: ' + data.message, 'error');
      }
    } catch (error) {
      addNotification('Error al eliminar', 'error');
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
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Filtrar:</label>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded border border-gray-300 text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="all">Todas</option>
                  {categories?.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Add Subcategory Form */}
              <form onSubmit={handleAddSubcategory} className="flex gap-2 flex-wrap md:flex-nowrap">
                <select 
                  value={newSubCategory}
                  onChange={(e) => setNewSubCategory(e.target.value)}
                  required 
                  className="rounded border border-gray-300 text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="">Categoría Padre</option>
                  {categories?.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <input 
                  type="text" 
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="Nueva Subcategoría" 
                  required 
                  className="rounded border border-gray-300 text-xs px-3 py-2 flex-1 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-black text-white px-4 py-2 rounded text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isSubmitting ? 'Añadiendo...' : 'Añadir'}
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Subcategoría</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Categoría Padre</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSubs?.map(sub => (
                  <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-xs font-bold text-gray-900">{sub.name}</td>
                    <td className="px-6 py-3 text-xs text-gray-600">{sub.category?.name}</td>
                    <td className="px-6 py-3 text-xs text-gray-500 italic">{sub.slug}</td>
                    <td className="px-6 py-3 text-xs">
                      <button 
                        onClick={() => handleDeleteSubcategory(sub.id)}
                        disabled={isSubmitting}
                        className="text-red-600 hover:text-red-800 font-semibold disabled:opacity-50"
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
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Listado de Marcas</h2>
            
            {/* Add Brand Form */}
            <form onSubmit={handleAddBrand} className="flex gap-2 flex-1 md:flex-none">
              <input 
                type="text" 
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Nueva Marca" 
                required 
                className="rounded border border-gray-300 text-xs px-3 py-2 flex-1 md:w-64 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-black text-white px-4 py-2 rounded text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {isSubmitting ? 'Añadiendo...' : 'Añadir'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {brandsList?.map(brand => (
              <div key={brand.id} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center group hover:border-gray-400 transition-colors">
                <span className="font-bold text-xs text-gray-900 truncate">{brand.name}</span>
                <button 
                  onClick={() => handleDeleteBrand(brand.id)}
                  disabled={isSubmitting}
                  className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
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
