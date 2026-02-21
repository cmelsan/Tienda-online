import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addNotification } from '@/stores/notifications';
import ConfirmModal from '@/components/ui/ConfirmModal';

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
  const [pendingDelete, setPendingDelete] = useState<{ type: 'subcategory' | 'brand'; id: string } | null>(null);

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName || !newSubCategory) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'create_subcategory', category_id: newSubCategory, name: newSubName })
      });
      const data = await response.json();
      if (data.success) {
        setSubs([...subs, data.subcategory]);
        setNewSubName('');
        setNewSubCategory('');
        addNotification('Subcategoria creada', 'success');
      } else {
        addNotification('Error: ' + (data.error || data.message), 'error');
      }
    } catch (error: any) {
      addNotification('Error al crear subcategoria: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    setPendingDelete({ type: 'subcategory', id });
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'create_brand', name: newBrandName })
      });
      const data = await response.json();
      if (data.success) {
        setBrandsList([...brandsList, data.brand]);
        setNewBrandName('');
        addNotification('Marca creada', 'success');
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
    setPendingDelete({ type: 'brand', id });
  };

  const filteredSubs = selectedCategory === 'all'
    ? subs
    : subs.filter(s => s.category_id === selectedCategory);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    setPendingDelete(null);
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: type === 'subcategory' ? 'delete_subcategory' : 'delete_brand', id })
      });
      const data = await response.json();
      if (data.success) {
        if (type === 'subcategory') setSubs(subs.filter(s => s.id !== id));
        else setBrandsList(brandsList.filter(b => b.id !== id));
        addNotification(type === 'subcategory' ? 'Subcategoría eliminada' : 'Marca eliminada', 'success');
      } else {
        addNotification('Error: ' + (data.error || data.message), 'error');
      }
    } catch (error: any) {
      addNotification('Error al eliminar: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <ConfirmModal
        isOpen={!!pendingDelete}
        title={pendingDelete?.type === 'subcategory' ? 'Eliminar subcategoría' : 'Eliminar marca'}
        message="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Catalogo</p>
            <p className="text-xs text-gray-400">Gestiona subcategorias y marcas</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-black text-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Subcategorias</p>
            <p className="text-3xl font-black">{subs.length}</p>
            <div className="w-6 h-0.5 bg-pink-500 mt-2"></div>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Marcas</p>
            <p className="text-2xl font-black text-black">{brandsList.length}</p>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Categorias</p>
            <p className="text-2xl font-black text-black">{categories.length}</p>
          </div>
          <div className="bg-white border border-gray-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Viendo</p>
            <p className="text-2xl font-black text-black">{filteredSubs.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('subcategories')}
          className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
            activeTab === 'subcategories'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Subcategorias
        </button>
        <button
          onClick={() => setActiveTab('brands')}
          className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
            activeTab === 'brands'
              ? 'border-black text-black'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Marcas
        </button>
      </div>

      {/* SUBCATEGORIES */}
      {activeTab === 'subcategories' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white border border-gray-200 p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Filtrar:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-200 text-xs px-3 py-2 focus:outline-none focus:border-black transition-colors bg-white"
              >
                <option value="all">Todas</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleAddSubcategory} className="flex gap-2">
              <select
                value={newSubCategory}
                onChange={(e) => setNewSubCategory(e.target.value)}
                required
                className="border border-gray-200 text-xs px-3 py-2 focus:outline-none focus:border-black transition-colors bg-white"
              >
                <option value="">Categoria Padre</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="Nueva Subcategoria"
                required
                className="border border-gray-200 text-xs px-3 py-2 flex-1 focus:outline-none focus:border-black transition-colors"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-black text-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-pink-500 transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {isSubmitting ? '...' : 'Anadir'}
              </button>
            </form>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Subcategoria</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Categoria Padre</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Slug</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs?.map(sub => (
                  <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-black text-black">{sub.name}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 border border-gray-200 px-2 py-1">
                        {sub.category?.name || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[10px] text-gray-400 font-mono">{sub.slug}</td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleDeleteSubcategory(sub.id)}
                        disabled={isSubmitting}
                        className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-wide disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSubs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[10px] font-bold uppercase tracking-widest text-gray-300">
                      Sin subcategorias
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BRANDS */}
      {activeTab === 'brands' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white border border-gray-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {brandsList.length} marcas registradas
            </p>
            <form onSubmit={handleAddBrand} className="flex gap-2">
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Nombre de la marca"
                required
                className="border border-gray-200 text-xs px-3 py-2 w-64 focus:outline-none focus:border-black transition-colors"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-black text-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-pink-500 transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {isSubmitting ? '...' : 'Anadir'}
              </button>
            </form>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Marca</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Slug</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {brandsList?.map(brand => (
                  <tr key={brand.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-black text-black">{brand.name}</td>
                    <td className="py-3.5 px-4 text-[10px] text-gray-400 font-mono">{brand.slug || '—'}</td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleDeleteBrand(brand.id)}
                        disabled={isSubmitting}
                        className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-wide disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {brandsList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-[10px] font-bold uppercase tracking-widest text-gray-300">
                      Sin marcas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
