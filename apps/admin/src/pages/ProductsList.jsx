import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, AlertCircle } from 'lucide-react';
import { getProducts, getCategories, softDeleteProduct } from '../services/products';

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodData, catData] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prodData);
      setCategories(catData);
    } catch (error) {
      alert('Gagal mengambil data produk: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await softDeleteProduct(productToDelete.id);
      setProducts(products.map(p => p.id === productToDelete.id ? { ...p, is_active: false } : p));
      setDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (error) {
      alert('Gagal menghapus produk: ' + error.message);
    }
  };

  // Filter Logic
  const filteredProducts = products.filter(p => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Produk</h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">Kelola katalog produk, varian, dan inventaris toko.</p>
        </div>
        <Link 
          to="/products/create"
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold transition-colors"
        >
          <Plus size={18} /> Tambah Produk
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm dark:shadow-none">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama produk..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
            />
          </div>
          <select 
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors w-full md:w-64 appearance-none"
          >
            <option value="">Semua Kategori</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800 text-yellow-600 dark:text-yellow-500 text-sm">
                <th className="pb-3 font-medium px-4">No</th>
                <th className="pb-3 font-medium px-4">Nama Produk</th>
                <th className="pb-3 font-medium px-4">Kategori</th>
                <th className="pb-3 font-medium px-4">Harga</th>
                <th className="pb-3 font-medium px-4">Stok</th>
                <th className="pb-3 font-medium px-4">Status</th>
                <th className="pb-3 font-medium px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-500 dark:text-zinc-500">Memuat data produk...</td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-500 dark:text-zinc-500">Tidak ada produk ditemukan.</td>
                </tr>
              ) : (
                paginatedProducts.map((product, index) => {
                  // Calculate total stock from variants or fallback to product stock
                  const totalStock = product.product_variants && product.product_variants.length > 0
                    ? product.product_variants.reduce((acc, v) => acc + v.stock, 0)
                    : product.stock;

                  return (
                    <tr key={product.id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/20 transition-colors">
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
                      <td className="py-4 px-4 text-gray-600 dark:text-zinc-300">{totalStock}</td>
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
                            title="Edit"
                          >
                            <Edit size={16} />
                          </Link>
                          <button 
                            onClick={() => handleDeleteClick(product)}
                            className="p-1.5 text-gray-400 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-500 bg-gray-100 dark:bg-zinc-800/50 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded transition-colors"
                            title="Nonaktifkan (Soft Delete)"
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-500 mb-4">
              <AlertCircle size={24} />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Konfirmasi Hapus</h3>
            </div>
            <p className="text-gray-600 dark:text-zinc-400 text-sm mb-6">
              Apakah Anda yakin ingin menghapus produk <span className="font-bold text-gray-900 dark:text-zinc-200">"{productToDelete?.name}"</span>? Produk ini hanya akan dinonaktifkan (Soft Delete) dan tidak akan dihapus dari riwayat transaksi.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
