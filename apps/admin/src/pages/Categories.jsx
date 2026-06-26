import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, AlertCircle, X, Search, GripVertical } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory, updateCategoryOrders } from '../services/products';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentCategory, setCurrentCategory] = useState({ name: '', slug: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (mode, category = null) => {
    setModalMode(mode);
    if (category) {
      setCurrentCategory({ ...category });
    } else {
      setCurrentCategory({ name: '', slug: '', description: '' });
    }
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentCategory({ name: '', slug: '', description: '' });
  };

  // Auto-generate slug from name
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setCurrentCategory(prev => {
      // Only auto-generate slug if we are adding, or if we want to update it on edit
      if (modalMode === 'add') {
        const newSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        return { ...prev, name: newName, slug: newSlug };
      }
      return { ...prev, name: newName };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentCategory.name || !currentCategory.slug) {
      setSaveError("Nama dan Slug wajib diisi.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      if (modalMode === 'add') {
        await createCategory({
          name: currentCategory.name,
          slug: currentCategory.slug,
          description: currentCategory.description
        });
      } else {
        await updateCategory(currentCategory.id, {
          name: currentCategory.name,
          slug: currentCategory.slug,
          description: currentCategory.description
        });
      }

      await fetchCategories();
      handleCloseModal();
    } catch (err) {
      if (err.code === '23505') { // Postgres unique violation code
        setSaveError("Slug ini sudah digunakan oleh kategori lain. Gunakan slug yang unik.");
      } else {
        setSaveError(err.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"?\nPerhatian: Menghapus kategori dapat menyebabkan produk yang terkait kehilangan kategorinya.`)) {
      try {
        await deleteCategory(id);
        await fetchCategories();
      } catch (err) {
        alert("Gagal menghapus kategori: " + err.message);
      }
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    // Don't do anything if dropped in the same position
    if (result.destination.index === result.source.index) return;

    // We only reorder the currently visible (filtered) categories
    // If user is searching, drag/drop should ideally be disabled or handled carefully.
    // For simplicity, we disable DND if there is a search query, or we just reorder the main array.
    if (searchQuery) {
      alert("Harap hapus pencarian sebelum mengatur ulang urutan.");
      return;
    }

    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update state immediately for snappy UI
    setCategories(items);

    // Prepare update payload
    const updates = items.map((item, index) => ({
      id: item.id,
      display_order: index + 1
    }));

    try {
      await updateCategoryOrders(updates);
    } catch (err) {
      console.error("Failed to save new order", err);
      alert("Gagal menyimpan urutan baru ke database.");
      // Revert if failed
      fetchCategories();
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Manajemen Kategori</h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">Kelola daftar kategori untuk mengelompokkan produk Anda.</p>
        </div>
        <button 
          onClick={() => handleOpenModal('add')}
          className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus size={20} />
          Tambah Kategori
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 mt-0.5" size={20} />
          <div>
            <h3 className="text-red-500 font-medium">Gagal memuat data</h3>
            <p className="text-red-400/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3 shadow-sm dark:shadow-none">
        <Search className="text-gray-400 dark:text-zinc-500" size={20} />
        <input 
          type="text" 
          placeholder="Cari kategori berdasarkan nama atau slug..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-gray-900 dark:text-zinc-200 w-full placeholder:text-gray-400 dark:placeholder:text-zinc-600"
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        {/* Table Header */}
        <div className="bg-gray-50 dark:bg-zinc-950/50 px-6 py-4 border-b border-gray-200 dark:border-zinc-800 grid grid-cols-[auto_1fr_1fr_2fr_auto] gap-4 items-center text-xs uppercase text-gray-500 dark:text-zinc-500 font-medium">
          <div className="w-8"></div>
          <div>Kategori</div>
          <div>Slug</div>
          <div>Deskripsi</div>
          <div className="text-right">Aksi</div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-zinc-800">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-zinc-500 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              Memuat data kategori...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-zinc-500">
              Tidak ada kategori ditemukan.
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="categories">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="w-full">
                    {filteredCategories.map((category, index) => (
                      <Draggable key={category.id.toString()} draggableId={category.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`grid grid-cols-[auto_1fr_1fr_2fr_auto] gap-4 items-center px-6 py-4 transition-colors ${
                              snapshot.isDragging ? 'bg-gray-100 dark:bg-zinc-800 shadow-lg z-50 rounded-lg border border-yellow-500/30' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/30 bg-white dark:bg-zinc-900'
                            }`}
                            style={{ ...provided.draggableProps.style }}
                          >
                            <div className="w-8 text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" {...provided.dragHandleProps}>
                              <GripVertical size={20} />
                            </div>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 shrink-0 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                <Tag className="text-yellow-600 dark:text-yellow-500/70" size={18} />
                              </div>
                              <span className="font-medium text-gray-900 dark:text-zinc-200 truncate">{category.name}</span>
                            </div>
                            <div className="overflow-hidden">
                              <span className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 text-xs font-mono truncate inline-block max-w-full border border-gray-200 dark:border-transparent">
                                {category.slug}
                              </span>
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-gray-500 dark:text-zinc-500 truncate">{category.description || '-'}</p>
                            </div>
                            <div className="flex items-center justify-end gap-2 shrink-0">
                              <button 
                                onClick={() => handleOpenModal('edit', category)}
                                className="p-2 text-gray-500 dark:text-zinc-400 hover:text-yellow-600 dark:hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDelete(category.id, category.name)}
                                className="p-2 text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Hapus"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Modal Tambah/Edit Kategori */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                {modalMode === 'add' ? 'Tambah Kategori' : 'Edit Kategori'}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              
              {saveError && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{saveError}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-zinc-400 block">Nama Kategori <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={currentCategory.name}
                  onChange={handleNameChange}
                  className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-zinc-200 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
                  placeholder="Contoh: Sarung Batik"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-zinc-400 block">Slug (URL) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={currentCategory.slug}
                  onChange={(e) => setCurrentCategory({...currentCategory, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                  className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-zinc-200 font-mono text-sm focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
                  placeholder="contoh: sarung-batik"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-zinc-500">Gunakan huruf kecil, angka, dan strip (-). Hindari spasi.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-zinc-400 block">Deskripsi (Opsional)</label>
                <textarea 
                  value={currentCategory.description}
                  onChange={(e) => setCurrentCategory({...currentCategory, description: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-zinc-200 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors resize-none h-24"
                  placeholder="Tulis deskripsi singkat mengenai kategori ini..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-black px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {isSaving && <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>}
                  {isSaving ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
