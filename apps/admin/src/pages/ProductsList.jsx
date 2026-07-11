import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, AlertCircle, Tag, GripVertical, X, Archive, RotateCcw, Package, Layers } from 'lucide-react';
import { getStockQueueStats } from '../services/expenses';
import { 
  getProducts, 
  getCategories, 
  softDeleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryOrders,
  updateProductOrders,
  getArchivedProducts,
  restoreProduct,
  deleteProductPermanently
} from '../services/products';
import { supabase } from '../lib/supabase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockQueueStats, setStockQueueStats] = useState({ totalPurchased: 0, totalUnallocated: 0, breakdown: {} });
  
  // Active Tab: 'active' or 'archived'
  const [activeTab, setActiveTab] = useState('active');
  const [selectedArchivedIds, setSelectedArchivedIds] = useState([]);

  // Filter & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Category search state
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Category Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState('add'); // 'add' or 'edit'
  const [currentCategory, setCurrentCategory] = useState({ name: '', slug: '', description: '' });
  const [categorySaving, setCategorySaving] = useState(false);
  const [categorySaveError, setCategorySaveError] = useState(null);

  // Product Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Product Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [productToRestore, setProductToRestore] = useState(null);
  const [newStockInput, setNewStockInput] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Product Permanent Delete Modal State
  const [permanentDeleteModalOpen, setPermanentDeleteModalOpen] = useState(false);
  const [productToPermanentlyDelete, setProductToPermanentlyDelete] = useState(null);
  const [deletingPermanently, setDeletingPermanently] = useState(false);

  // Bulk deletion state
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodData, catData, archiveData, queueStats] = await Promise.all([
        getProducts(), 
        getCategories(),
        getArchivedProducts(),
        getStockQueueStats()
      ]);
      setProducts(prodData);
      setCategories(catData);
      setArchivedProducts(archiveData);
      setStockQueueStats(queueStats);

      // Automatically clean up archived products older than 30 days
      await autoCleanupExpiredArchive(archiveData);
    } catch (error) {
      alert('Gagal mengambil data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const autoCleanupExpiredArchive = async (archivedList) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expiredProducts = archivedList.filter(p => {
      if (!p.archived_at) return false;
      return new Date(p.archived_at) < thirtyDaysAgo;
    });

    if (expiredProducts.length === 0) return;

    console.log(`Auto-cleaning ${expiredProducts.length} expired archived products...`);

    let didCleanup = false;
    for (const product of expiredProducts) {
      try {
        // 1. Gather all file paths/names
        const mediaUrls = [];
        if (product.image_url) mediaUrls.push(product.image_url);
        if (product.images && Array.isArray(product.images)) {
          product.images.forEach(img => {
            if (img && !mediaUrls.includes(img)) mediaUrls.push(img);
          });
        }

        const filesToDelete = mediaUrls
          .map(url => {
            const parts = url.split('/public/products/');
            return parts.length > 1 ? parts[1] : null;
          })
          .filter(name => name !== null);

        if (filesToDelete.length > 0) {
          await supabase.storage.from('products').remove(filesToDelete);
        }

        // 2. Delete database row
        await deleteProductPermanently(product.id);
        didCleanup = true;
      } catch (err) {
        console.error(`Failed to auto-delete expired product ${product.name}:`, err);
      }
    }

    if (didCleanup) {
      const archiveData = await getArchivedProducts();
      setArchivedProducts(archiveData);
    }
  };

  // Product Delete handlers (Soft Delete to Archive)
  const handleDeleteProductClick = (product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await softDeleteProduct(productToDelete.id);
      
      // Soft deletion puts it in the archive or disables it.
      // We also update is_archived = true, archived_at = NOW() in products table to match our archiving logic
      await supabase
        .from('products')
        .update({ is_archived: true, archived_at: new Date().toISOString(), is_active: false })
        .eq('id', productToDelete.id);

      // Re-fetch products
      const [prodData, archiveData] = await Promise.all([
        getProducts(),
        getArchivedProducts()
      ]);
      setProducts(prodData);
      setArchivedProducts(archiveData);

      setDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (error) {
      alert('Gagal mengarsipkan produk: ' + error.message);
    }
  };

  // Product Restore handlers
  const handleRestoreClick = (product) => {
    setProductToRestore(product);
    setNewStockInput('');
    setRestoreModalOpen(true);
  };

  const confirmRestoreProduct = async (e) => {
    e.preventDefault();
    if (!productToRestore) return;
    const stockVal = parseInt(newStockInput, 10);
    if (isNaN(stockVal) || stockVal <= 0) {
      alert("Harap masukkan jumlah stok yang valid (lebih dari 0)!");
      return;
    }

    try {
      setRestoring(true);
      await restoreProduct(productToRestore.id, stockVal);
      
      const [prodData, archiveData] = await Promise.all([
        getProducts(),
        getArchivedProducts()
      ]);
      setProducts(prodData);
      setArchivedProducts(archiveData);

      setRestoreModalOpen(false);
      setProductToRestore(null);
      setNewStockInput('');
    } catch (error) {
      alert("Gagal memulihkan produk: " + error.message);
    } finally {
      setRestoring(false);
    }
  };

  // Permanent Delete handlers
  const handlePermanentDeleteClick = (product) => {
    setProductToPermanentlyDelete(product);
    setPermanentDeleteModalOpen(true);
  };

  const confirmPermanentDeleteProduct = async () => {
    if (!productToPermanentlyDelete) return;
    try {
      setDeletingPermanently(true);

      // 1. Gather all file paths/names
      const mediaUrls = [];
      if (productToPermanentlyDelete.image_url) mediaUrls.push(productToPermanentlyDelete.image_url);
      if (productToPermanentlyDelete.images && Array.isArray(productToPermanentlyDelete.images)) {
        productToPermanentlyDelete.images.forEach(img => {
          if (img && !mediaUrls.includes(img)) mediaUrls.push(img);
        });
      }

      const filesToDelete = mediaUrls
        .map(url => {
          const parts = url.split('/public/products/');
          return parts.length > 1 ? parts[1] : null;
        })
        .filter(name => name !== null);

      if (filesToDelete.length > 0) {
        await supabase.storage.from('products').remove(filesToDelete);
      }

      // 2. Delete database row
      await deleteProductPermanently(productToPermanentlyDelete.id);

      setArchivedProducts(archivedProducts.filter(p => p.id !== productToPermanentlyDelete.id));
      setSelectedArchivedIds(selectedArchivedIds.filter(id => id !== productToPermanentlyDelete.id));
      setPermanentDeleteModalOpen(false);
      setProductToPermanentlyDelete(null);
    } catch (error) {
      alert('Gagal menghapus produk secara permanen: ' + error.message);
    } finally {
      setDeletingPermanently(false);
    }
  };

  // Bulk delete archived products
  const handleBulkDeleteArchived = async () => {
    if (selectedArchivedIds.length === 0) return;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus permanen ${selectedArchivedIds.length} produk terpilih beserta seluruh fotonya? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      setIsBulkDeleting(true);

      for (const id of selectedArchivedIds) {
        const product = archivedProducts.find(p => p.id === id);
        if (!product) continue;

        const mediaUrls = [];
        if (product.image_url) mediaUrls.push(product.image_url);
        if (product.images && Array.isArray(product.images)) {
          product.images.forEach(img => {
            if (img && !mediaUrls.includes(img)) mediaUrls.push(img);
          });
        }

        const filesToDelete = mediaUrls
          .map(url => {
            const parts = url.split('/public/products/');
            return parts.length > 1 ? parts[1] : null;
          })
          .filter(name => name !== null);

        if (filesToDelete.length > 0) {
          await supabase.storage.from('products').remove(filesToDelete);
        }

        await deleteProductPermanently(id);
      }

      setArchivedProducts(archivedProducts.filter(p => !selectedArchivedIds.includes(p.id)));
      setSelectedArchivedIds([]);
      alert("Berhasil menghapus produk terpilih secara permanen.");
    } catch (error) {
      alert("Gagal melakukan hapus massal: " + error.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Category Modal handlers
  const handleOpenCategoryModal = (mode, category = null) => {
    setCategoryModalMode(mode);
    if (category) {
      setCurrentCategory({ ...category });
    } else {
      setCurrentCategory({ name: '', slug: '', description: '' });
    }
    setCategorySaveError(null);
    setCategoryModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setCategoryModalOpen(false);
    setCurrentCategory({ name: '', slug: '', description: '' });
  };

  const handleCategoryNameChange = (e) => {
    const newName = e.target.value;
    setCurrentCategory(prev => {
      if (categoryModalMode === 'add') {
        const newSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        return { ...prev, name: newName, slug: newSlug };
      }
      return { ...prev, name: newName };
    });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!currentCategory.name || !currentCategory.slug) {
      setCategorySaveError("Nama dan Slug wajib diisi.");
      return;
    }

    try {
      setCategorySaving(true);
      setCategorySaveError(null);

      if (categoryModalMode === 'add') {
        await createCategory({
          name: currentCategory.name,
          slug: currentCategory.slug
        });
      } else {
        await updateCategory(currentCategory.id, {
          name: currentCategory.name,
          slug: currentCategory.slug
        });
      }

      const catData = await getCategories();
      setCategories(catData);
      handleCloseCategoryModal();
    } catch (err) {
      if (err.code === '23505') {
        setCategorySaveError("Slug ini sudah digunakan oleh kategori lain. Gunakan slug yang unik.");
      } else {
        setCategorySaveError(err.message);
      }
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"?\nPerhatian: Menghapus kategori dapat menyebabkan produk yang terkait kehilangan kategorinya.`)) {
      try {
        await deleteCategory(id);
        const catData = await getCategories();
        setCategories(catData);
        if (selectedCategory === id) {
          setSelectedCategory('');
        }
      } catch (err) {
        alert("Gagal menghapus kategori: " + err.message);
      }
    }
  };

  const handleCategoryDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    if (categorySearchQuery) {
      alert("Harap hapus pencarian kategori sebelum mengatur ulang urutan.");
      return;
    }

    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCategories(items);

    const updates = items.map((item, index) => ({
      id: item.id,
      display_order: index + 1
    }));

    try {
      await updateCategoryOrders(updates);
    } catch (err) {
      console.error("Failed to save new order", err);
      alert("Gagal menyimpan urutan baru ke database.");
      const catData = await getCategories();
      setCategories(catData);
    }
  };

  const handleProductDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    if (searchTerm) {
      alert("Harap hapus pencarian produk sebelum mengatur ulang urutan.");
      return;
    }

    const items = Array.from(paginatedProducts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const startOrder = (currentPage - 1) * itemsPerPage;
    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: startOrder + index + 1
    }));

    const updatedMap = new Map(updatedItems.map(p => [p.id, p]));
    const newProducts = products.map(p => {
      if (updatedMap.has(p.id)) return updatedMap.get(p.id);
      return p;
    });

    newProducts.sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    setProducts(newProducts);

    const updates = updatedItems.map(p => ({
      id: p.id,
      display_order: p.display_order
    }));

    try {
      await updateProductOrders(updates);
    } catch (err) {
      console.error("Failed to save new product order", err);
      alert("Gagal menyimpan urutan baru produk ke database.");
      fetchData();
    }
  };

  // Filter Logic
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  const filteredProducts = (activeTab === 'active' ? products : archivedProducts).filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Dynamic Widget Stats Logic
  const selectedCategoryObj = categories.find(c => c.id === selectedCategory);
  const selectedCategoryName = selectedCategoryObj ? selectedCategoryObj.name : null;
  
  let displayUnallocated = stockQueueStats.totalUnallocated;
  let showBreakdown = true;

  if (selectedCategoryName) {
    displayUnallocated = (stockQueueStats.breakdown && stockQueueStats.breakdown[selectedCategoryName]) || 0;
    showBreakdown = false;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Produk & Kategori</h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">Kelola katalog produk, varian, dan kategori toko dalam satu tempat.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleOpenCategoryModal('add')}
            className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 px-4 py-2 rounded-lg font-bold transition-colors text-sm"
          >
            <Plus size={16} /> Tambah Kategori
          </button>
          <Link 
            to="/products/create"
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold transition-colors text-sm"
          >
            <Plus size={16} /> Tambah Produk
          </Link>
        </div>
      </div>

      {/* Stock Queue Stats Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-zinc-950 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/80 p-4 rounded-xl shadow-sm">
          <div className="p-3 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-lg">
            <Package size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Total Stok Fisik Dibeli (Restock)</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{stockQueueStats.totalPurchased} pcs</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/80 p-4 rounded-xl shadow-sm">
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Stok Antrean Belum Terinput ke Toko</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{displayUnallocated} pcs</p>
              {displayUnallocated > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full animate-pulse">
                  Butuh Input
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 rounded-full">
                  Sinkron
                </span>
              )}
            </div>
            {/* Breakdown per category if showing all */}
            {showBreakdown && stockQueueStats.totalUnallocated > 0 && stockQueueStats.breakdown && Object.keys(stockQueueStats.breakdown).length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {Object.entries(stockQueueStats.breakdown).map(([cat, qty]) => (
                  <span key={cat} className="px-1.5 py-0.5 text-[9px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded">
                    {cat}: <span className="font-bold text-gray-900 dark:text-zinc-100">{qty} pcs</span>
                  </span>
                ))}
              </div>
            )}
            {/* Display category specific label if one is selected */}
            {!showBreakdown && displayUnallocated > 0 && (
               <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded">
                    {selectedCategoryName}: <span className="font-bold text-gray-900 dark:text-zinc-100">{displayUnallocated} pcs</span>
                  </span>
               </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Categories Panel */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm dark:shadow-none h-fit">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <Tag className="text-yellow-500" size={18} />
              Daftar Kategori
            </h2>
            <span className="text-xs text-gray-400 dark:text-zinc-550 select-none">Tarik & lepas untuk urutan</span>
          </div>

          {/* Category Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Cari kategori..." 
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
            />
          </div>

          {/* Category List with Drag and Drop */}
          <div className="space-y-1 overflow-y-auto max-h-[500px] pr-1">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-zinc-500">Memuat kategori...</div>
            ) : (
              <DragDropContext onDragEnd={handleCategoryDragEnd}>
                <Droppable droppableId="categories">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                      {/* "Semua Kategori" tab */}
                      <div 
                        onClick={() => {
                          setSelectedCategory('');
                          setCurrentPage(1);
                        }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${
                          selectedCategory === '' 
                            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20 font-semibold' 
                            : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-700 dark:text-zinc-300 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Tag size={16} className={selectedCategory === '' ? 'text-yellow-500' : 'text-gray-400'} />
                          <span className="text-sm">Semua Kategori</span>
                        </div>
                        <span className="text-xs bg-gray-100 dark:bg-zinc-850 text-gray-500 dark:text-zinc-400 px-2 py-0.5 rounded-full font-medium">
                          {activeTab === 'active' ? products.length : archivedProducts.length}
                        </span>
                      </div>

                      {/* Filtered categories */}
                      {filteredCategories.length === 0 ? (
                        <div className="py-4 text-center text-sm text-gray-500 dark:text-zinc-500">Tidak ada kategori</div>
                      ) : (
                        filteredCategories.map((category, index) => {
                          const productCount = (activeTab === 'active' ? products : archivedProducts).filter(p => p.category_id === category.id).length;
                          const isCategoryOff = productCount === 0;
                          const isSelected = selectedCategory === category.id;

                          return (
                            <Draggable key={category.id.toString()} draggableId={category.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  onClick={() => {
                                    if (isCategoryOff && !isSelected) return; // Optional: prevent clicking off categories if you want, but better leave clickable so they can see it's empty
                                    setSelectedCategory(category.id);
                                    setCurrentPage(1);
                                  }}
                                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group border cursor-pointer ${
                                    isSelected 
                                      ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20 font-semibold' 
                                      : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-700 dark:text-zinc-300 border-transparent'
                                  } ${snapshot.isDragging ? 'bg-gray-100 dark:bg-zinc-800 shadow-md border-yellow-500/30' : ''} ${isCategoryOff ? 'opacity-50 grayscale' : ''}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div 
                                      className="text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 cursor-grab"
                                      {...provided.dragHandleProps}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <GripVertical size={16} />
                                    </div>
                                    <span 
                                      className="truncate select-none text-sm"
                                      title={category.name}
                                    >
                                      {category.name}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isCategoryOff ? (
                                      <span className="text-[9px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide group-hover:hidden">Off</span>
                                    ) : (
                                      <span className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide group-hover:hidden">Aktif</span>
                                    )}
                                    <span className="text-xs bg-gray-100 dark:bg-zinc-850 text-gray-500 dark:text-zinc-400 px-2 py-0.5 rounded-full font-medium group-hover:hidden">
                                      {productCount}
                                    </span>
                                    
                                    {/* Action buttons on hover */}
                                    <div className="hidden group-hover:flex items-center gap-0.5">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenCategoryModal('edit', category);
                                        }}
                                        className="p-1 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                        title="Edit Kategori"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteCategory(category.id, category.name);
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                        title="Hapus Kategori"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>

        {/* Right Column: Products List Table */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm dark:shadow-none">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedCategory 
                  ? `Daftar Produk: ${categories.find(c => c.id === selectedCategory)?.name || ''}` 
                  : 'Semua Produk'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Menampilkan {filteredProducts.length} produk.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {activeTab === 'archived' && selectedArchivedIds.length > 0 && (
                <button
                  onClick={handleBulkDeleteArchived}
                  disabled={isBulkDeleting}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors text-sm disabled:opacity-50"
                >
                  <Trash2 size={16} /> Hapus Terpilih ({selectedArchivedIds.length})
                </button>
              )}
              {/* Product Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari nama produk..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-gray-200 dark:border-zinc-800 mb-6 gap-6">
            <button
              onClick={() => {
                setActiveTab('active');
                setCurrentPage(1);
              }}
              className={`pb-3 font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'active' 
                  ? 'border-yellow-500 text-yellow-600 dark:text-yellow-500' 
                  : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'
              }`}
            >
              Semua Produk ({products.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('archived');
                setCurrentPage(1);
              }}
              className={`pb-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'archived' 
                  ? 'border-yellow-500 text-yellow-600 dark:text-yellow-500' 
                  : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'
              }`}
            >
              <Archive size={16} />
              Arsip Produk ({archivedProducts.length})
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {activeTab === 'active' ? (
              <DragDropContext onDragEnd={handleProductDragEnd}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-zinc-800 text-yellow-600 dark:text-yellow-500 text-sm">
                      <th className="pb-3 font-medium px-4 w-10"></th>
                      <th className="pb-3 font-medium px-4">No</th>
                      <th className="pb-3 font-medium px-4">Nama Produk</th>
                      <th className="pb-3 font-medium px-4">Kategori</th>
                      <th className="pb-3 font-medium px-4">Harga</th>
                      <th className="pb-3 font-medium px-4">Stok</th>
                      <th className="pb-3 font-medium px-4">Terjual</th>
                      <th className="pb-3 font-medium px-4">Status</th>
                      <th className="pb-3 font-medium px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <Droppable droppableId="products-list" type="PRODUCT">
                    {(provided) => (
                      <tbody 
                        className="text-sm"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {loading ? (
                          <tr>
                            <td colSpan="9" className="text-center py-10 text-gray-500 dark:text-zinc-500">Memuat data produk...</td>
                          </tr>
                        ) : paginatedProducts.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="text-center py-10 text-gray-500 dark:text-zinc-500">Tidak ada produk ditemukan.</td>
                          </tr>
                        ) : (
                          paginatedProducts.map((product, index) => {
                            const totalStock = product.product_variants && product.product_variants.length > 0
                              ? product.product_variants.reduce((acc, v) => acc + v.stock, 0)
                              : product.stock;

                            return (
                              <Draggable key={product.id.toString()} draggableId={product.id.toString()} index={index}>
                                {(providedRow, snapshotRow) => (
                                  <tr 
                                    ref={providedRow.innerRef}
                                    {...providedRow.draggableProps}
                                    className={`border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/20 transition-colors ${
                                      snapshotRow.isDragging ? 'bg-gray-100 dark:bg-zinc-850 shadow-md' : ''
                                    }`}
                                  >
                                    <td className="py-4 px-4">
                                      <div 
                                        className="text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 cursor-grab flex justify-center animate-pulse"
                                        {...providedRow.dragHandleProps}
                                      >
                                        <GripVertical size={16} />
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 text-gray-500 dark:text-zinc-400">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="py-4 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded bg-gray-100 dark:bg-zinc-800 shrink-0 overflow-hidden border border-gray-200 dark:border-zinc-700">
                                          {product.images && product.images[0] ? (
                                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                          ) : product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 dark:text-zinc-500">No Img</div>
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-medium text-gray-900 dark:text-zinc-200">{product.name}</div>
                                          <div className="text-xs text-gray-500 dark:text-zinc-500">{product.product_variants?.length || 0} varian</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 text-gray-600 dark:text-zinc-300">{product.categories?.name || '-'}</td>
                                    <td className="py-4 px-4 text-gray-600 dark:text-zinc-300">Rp {product.price?.toLocaleString('id-ID')}</td>
                                    <td className="py-4 px-4">
                                      <div className="flex items-center gap-2">
                                        <span className={`font-medium ${totalStock === 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-zinc-300'}`}>
                                          {totalStock}
                                        </span>
                                        {totalStock === 0 && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                                            Habis
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 text-gray-600 dark:text-zinc-300">{product.sold_count ?? 0}</td>
                                    <td className="py-4 px-4">
                                      {product.is_active ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20">Aktif</span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20">Nonaktif</span>
                                      )}
                                    </td>
                                    <td className="py-4 px-4">
                                      <div className="flex justify-end gap-2">
                                        <Link 
                                          to={`/products/edit/${product.id}`}
                                          className="p-1.5 text-gray-400 dark:text-zinc-400 hover:text-yellow-600 dark:hover:text-yellow-500 bg-gray-100 dark:bg-zinc-800/50 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded transition-colors"
                                          title="Edit Produk"
                                        >
                                          <Edit size={16} />
                                        </Link>
                                        <button 
                                          onClick={() => handleDeleteProductClick(product)}
                                          className="p-1.5 text-gray-400 dark:text-zinc-400 hover:text-yellow-600 dark:hover:text-yellow-500 bg-gray-100 dark:bg-zinc-800/50 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded transition-colors"
                                          title="Arsipkan Produk"
                                        >
                                          <Archive size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Draggable>
                            );
                          })
                        )}
                        {provided.placeholder}
                      </tbody>
                    )}
                  </Droppable>
                </table>
              </DragDropContext>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-zinc-800 text-yellow-600 dark:text-yellow-500 text-sm">
                    <th className="pb-3 font-medium px-4 w-10">
                      <input 
                        type="checkbox"
                        checked={
                          paginatedProducts.length > 0 &&
                          paginatedProducts.every(p => selectedArchivedIds.includes(p.id))
                        }
                        onChange={(e) => {
                          const allIdsOnPage = paginatedProducts.map(p => p.id);
                          if (e.target.checked) {
                            setSelectedArchivedIds(prev => {
                              const next = [...prev];
                              allIdsOnPage.forEach(id => {
                                if (!next.includes(id)) next.push(id);
                              });
                              return next;
                            });
                          } else {
                            setSelectedArchivedIds(prev => prev.filter(id => !allIdsOnPage.includes(id)));
                          }
                        }}
                        className="rounded border-zinc-700 bg-zinc-950 text-yellow-500 focus:ring-yellow-500"
                      />
                    </th>
                    <th className="pb-3 font-medium px-4">No</th>
                    <th className="pb-3 font-medium px-4">Nama Produk</th>
                    <th className="pb-3 font-medium px-4">Kategori</th>
                    <th className="pb-3 font-medium px-4">Harga</th>
                    <th className="pb-3 font-medium px-4">Diarsip Pada</th>
                    <th className="pb-3 font-medium px-4">Sisa Waktu</th>
                    <th className="pb-3 font-medium px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-10 text-gray-500 dark:text-zinc-500">Memuat data arsip...</td>
                    </tr>
                  ) : paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-10 text-gray-500 dark:text-zinc-500">Tidak ada produk dalam arsip.</td>
                    </tr>
                  ) : (
                    paginatedProducts.map((product, index) => {
                      const getRemainingDays = (archivedAt) => {
                        if (!archivedAt) return '-';
                        const archiveDate = new Date(archivedAt);
                        const expiryDate = new Date(archiveDate);
                        expiryDate.setDate(expiryDate.getDate() + 30);
                        const diffTime = expiryDate - new Date();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays > 0 ? `${diffDays} hari` : 'Hapus otomatis';
                      };

                      return (
                        <tr 
                          key={product.id}
                          className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/20 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <input 
                              type="checkbox"
                              checked={selectedArchivedIds.includes(product.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedArchivedIds(prev => [...prev, product.id]);
                                } else {
                                  setSelectedArchivedIds(prev => prev.filter(id => id !== product.id));
                                }
                              }}
                              className="rounded border-zinc-700 bg-zinc-950 text-yellow-500 focus:ring-yellow-500"
                            />
                          </td>
                          <td className="py-4 px-4 text-gray-500 dark:text-zinc-400">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-gray-100 dark:bg-zinc-800 shrink-0 overflow-hidden border border-gray-200 dark:border-zinc-700">
                                {product.images && product.images[0] ? (
                                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                ) : product.image_url ? (
                                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 dark:text-zinc-500">No Img</div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-zinc-200">{product.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600 dark:text-zinc-300">{product.categories?.name || '-'}</td>
                          <td className="py-4 px-4 text-gray-600 dark:text-zinc-300">Rp {product.price?.toLocaleString('id-ID')}</td>
                          <td className="py-4 px-4 text-gray-600 dark:text-zinc-300">
                            {product.archived_at ? new Date(product.archived_at).toLocaleDateString('id-ID') : '-'}
                          </td>
                          <td className="py-4 px-4 font-semibold text-red-500">
                            {getRemainingDays(product.archived_at)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleRestoreClick(product)}
                                className="p-1.5 text-gray-400 dark:text-zinc-400 hover:text-green-500 bg-gray-100 dark:bg-zinc-800/50 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded transition-colors"
                                title="Pulihkan Produk"
                              >
                                <RotateCcw size={16} />
                              </button>
                              <button 
                                onClick={() => handlePermanentDeleteClick(product)}
                                className="p-1.5 text-gray-400 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-500 bg-gray-100 dark:bg-zinc-800/50 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded transition-colors"
                                title="Hapus Permanen"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-zinc-800">
              <span className="text-sm text-gray-500 dark:text-zinc-400">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} dari {filteredProducts.length} produk
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Prev
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Add/Edit Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseCategoryModal}></div>
          <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                {categoryModalMode === 'add' ? 'Tambah Kategori' : 'Edit Kategori'}
              </h2>
              <button 
                onClick={handleCloseCategoryModal}
                className="text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-5">
              
              {categorySaveError && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{categorySaveError}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-zinc-400 block">Nama Kategori <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={currentCategory.name}
                  onChange={handleCategoryNameChange}
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



              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={handleCloseCategoryModal}
                  className="px-5 py-2.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={categorySaving}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-black px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {categorySaving && <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>}
                  {categorySaving ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Product Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-650 dark:text-red-500 mb-4">
              <AlertCircle size={24} />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Konfirmasi Arsip</h3>
            </div>
            <p className="text-gray-600 dark:text-zinc-400 text-sm mb-6">
              Apakah Anda yakin ingin mengarsipkan produk <span className="font-bold text-gray-900 dark:text-zinc-200">"{productToDelete?.name}"</span>? Produk akan dipindahkan ke tab Arsip dan dinonaktifkan dari katalog toko.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDeleteProduct}
                className="px-4 py-2 rounded-lg font-medium text-white bg-yellow-500 hover:bg-yellow-600 text-black transition-colors"
              >
                Ya, Arsipkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Restore Modal */}
      {restoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                <RotateCcw className="text-green-500" size={20} />
                Pulihkan Produk
              </h2>
              <button 
                onClick={() => setRestoreModalOpen(false)}
                className="text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={confirmRestoreProduct} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                Masukkan jumlah stok baru untuk memulihkan produk <span className="font-bold text-gray-900 dark:text-zinc-200">"{productToRestore?.name}"</span> ke katalog toko.
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-zinc-400 block">
                  Jumlah Stok Baru <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={newStockInput}
                  onChange={(e) => setNewStockInput(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-zinc-200 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors font-semibold"
                  placeholder="Contoh: 10"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setRestoreModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={restoring || !newStockInput || parseInt(newStockInput, 10) <= 0}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-black px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {restoring && <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>}
                  {restoring ? 'Memulihkan...' : 'Simpan & Pulihkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Permanent Delete Confirmation Modal */}
      {permanentDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-650 dark:text-red-500 mb-4">
              <AlertCircle size={24} />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hapus Permanen</h3>
            </div>
            <p className="text-gray-605 dark:text-zinc-400 text-sm mb-6">
              Apakah Anda yakin ingin menghapus produk <span className="font-bold text-gray-900 dark:text-zinc-200">"{productToPermanentlyDelete?.name}"</span> secara permanen?
              <span className="block mt-2 font-semibold text-red-550">Peringatan: Seluruh file gambar dan video di Supabase Storage juga akan dihapus. Tindakan ini TIDAK dapat dibatalkan!</span>
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setPermanentDeleteModalOpen(false)}
                disabled={deletingPermanently}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmPermanentDeleteProduct}
                disabled={deletingPermanently}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-750 transition-colors flex items-center gap-2"
              >
                {deletingPermanently && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
