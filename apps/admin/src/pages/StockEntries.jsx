import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  ShoppingBag, 
  Layers, 
  RefreshCw, 
  AlertCircle, 
  Inbox, 
  Tag, 
  Coins,
  ArrowRight,
  TrendingUp,
  Percent,
  Search
} from 'lucide-react';
import {
  createExpense, 
  updateExpense, 
  deleteExpense 
} from '../services/expenses';
import { getCategories } from '../services/products';


export default function StockEntries() {
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const getLocalDateString = (date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date - tzOffset).toISOString().slice(0, 10);
  };

  const [quickFilter, setQuickFilter] = useState('this_month');
  const [dateRange, setDateRange] = useState({
    startDate: (() => {
      const today = new Date();
      return getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
    })(),
    endDate: getLocalDateString(new Date())
  });

  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [currentEntry, setCurrentEntry] = useState({
    title: '',
    expense_date: '',
    amount: '',
    quantity: '',
    notes: '',
    category: 'restock'
  });
  const [saving, setSaving] = useState(false);



  const fetchEntries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (dateRange.startDate && dateRange.endDate) {
        query = query
          .gte('expense_date', new Date(`${dateRange.startDate}T00:00:00`).toISOString())
          .lte('expense_date', new Date(`${dateRange.endDate}T23:59:59`).toISOString());
      }

      const [{ data, error }, cats] = await Promise.all([
        query,
        getCategories()
      ]);

      if (error) throw error;
      setEntries(data || []);
      setCategories(cats || []);
    } catch (err) {
      console.error('Error fetching stock entries or categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [dateRange]);

  const handleQuickFilter = (type) => {
    setQuickFilter(type);
    const today = new Date();
    let start = getLocalDateString(today);
    let end = getLocalDateString(today);

    if (type === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = getLocalDateString(firstDay);
    } else if (type === '1m') {
      const past = new Date();
      past.setMonth(today.getMonth() - 1);
      start = getLocalDateString(past);
    } else if (type === 'all') {
      start = '2020-01-01';
    }

    setDateRange({ startDate: start, endDate: end });
  };

  const handleOpenModal = (mode, entry = null) => {
    setModalMode(mode);
    if (entry) {
      setCurrentEntry({
        id: entry.id,
        title: entry.title,
        expense_date: entry.expense_date.split('T')[0],
        amount: entry.amount,
        quantity: entry.quantity,
        notes: entry.notes || '',
        allocated_quantity: entry.allocated_quantity || 0,
        category: entry.category || 'restock'
      });
    } else {
      setCurrentEntry({
        title: '',
        expense_date: getLocalDateString(new Date()),
        amount: '',
        quantity: '',
        notes: '',
        category: 'restock'
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentEntry.title || !currentEntry.expense_date || !currentEntry.amount || (currentEntry.category === 'restock' && !currentEntry.quantity)) {
      alert("Harap isi semua kolom wajib!");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: currentEntry.title,
        expense_date: new Date(currentEntry.expense_date).toISOString(),
        category: currentEntry.category,
        amount: parseFloat(currentEntry.amount),
        quantity: currentEntry.category === 'restock' ? parseInt(currentEntry.quantity, 10) : 0,
        notes: currentEntry.notes
      };

      if (modalMode === 'add') {
        payload.allocated_quantity = currentEntry.category === 'restock' ? 0 : null;
        await createExpense(payload);
      } else {
        payload.allocated_quantity = currentEntry.allocated_quantity;
        await updateExpense(currentEntry.id, payload);
      }

      await fetchEntries();
      setModalOpen(false);
    } catch (err) {
      alert("Gagal menyimpan stok masuk: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Hapus catatan stok masuk "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        await deleteExpense(id);
        await fetchEntries();
      } catch (err) {
        alert("Gagal menghapus catatan: " + err.message);
      }
    }
  };

  // Calculations for stats (restock only for some stats)
  const restockEntries = entries.filter(e => e.category === 'restock');
  const totalPurchased = restockEntries.reduce((sum, e) => sum + (e.quantity || 0), 0);
  const totalAllocated = restockEntries.reduce((sum, e) => sum + (e.allocated_quantity || 0), 0);
  const totalUnallocated = Math.max(0, totalPurchased - totalAllocated);
  const totalSpend = entries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  const filteredEntries = entries.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-fade-in space-y-8">
      <style>{`
        /* Hide number input spinners */
        .no-spinners::-webkit-inner-spin-button,
        .no-spinners::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinners {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-playfair font-bold text-gray-900 dark:text-white tracking-wide flex items-center gap-2">
            <Layers className="text-emas" size={28} /> Pengeluaran Toko
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2">
            Kelola pengeluaran operasional toko dan antrean alokasi (input) stok barang ke dalam toko.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchEntries}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-white rounded-xl transition-all"
            title="Segarkan Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => handleOpenModal('add')}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2.5 rounded-xl font-bold transition-all text-sm"
          >
            <Plus size={16} /> Catat Pengeluaran
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-zinc-800/60 p-6 shadow-soft space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-1 bg-gray-100/50 dark:bg-zinc-800/20 p-1 rounded-2xl border border-gray-200/50 dark:border-zinc-800/40">
            {[
              { id: 'all', label: 'ALL', tooltip: 'Semua Waktu' },
              { id: 'this_month', label: 'Bulan Ini', tooltip: 'Bulan Berjalan' },
              { id: '1m', label: '1 Bulan Terakhir', tooltip: '30 Hari Terakhir' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => handleQuickFilter(f.id)}
                title={f.tooltip}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  quickFilter === f.id
                    ? 'bg-yellow-500 text-black shadow-glow'
                    : 'bg-transparent hover:bg-gray-200/60 dark:hover:bg-zinc-800/50 text-gray-500 dark:text-zinc-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Date Picker Form */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => {
                  setQuickFilter('');
                  setDateRange(prev => ({ ...prev, startDate: e.target.value }));
                }}
                className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emas"
              />
            </div>
            <span className="text-gray-400 dark:text-zinc-600 text-sm font-medium">s/d</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => {
                  setQuickFilter('');
                  setDateRange(prev => ({ ...prev, endDate: e.target.value }));
                }}
                className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emas"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Stat 2 */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Antrean Belum Terinput</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalUnallocated} pcs</p>
              {totalUnallocated > 0 && (
                <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20 rounded-full animate-pulse">
                  Butuh Input
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-500/10 text-green-600 dark:text-green-500 rounded-xl shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Telah Terinput (Toko)</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{totalAllocated} pcs</p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-500 rounded-xl shrink-0">
            <Coins size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Total Pengeluaran Stok</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">Rp {totalSpend.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-zinc-800/60 p-6 shadow-soft space-y-6">
        
        {/* Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 dark:border-zinc-800/60 pb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-200">Daftar Pengeluaran & Stok</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cari deskripsi / judul..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emas"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-sm font-bold text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Tanggal</th>
                  <th className="pb-3">Keterangan</th>
                  <th className="pb-3 text-center">Status Alokasi</th>
                  <th className="pb-3 text-right">Kuantitas</th>
                  <th className="pb-3 text-right">Harga Satuan</th>
                  <th className="pb-3 text-right">Total Biaya</th>
                  <th className="pb-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-400 dark:text-zinc-500">
                      Tidak ada catatan pengeluaran yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(item => {
                    const formattedDate = new Date(item.expense_date).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    });

                    const unitPrice = item.quantity > 0 ? Math.round(parseFloat(item.amount) / item.quantity) : 0;
                    const allocatedPercent = item.quantity > 0 ? Math.round((item.allocated_quantity / item.quantity) * 100) : 0;
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="py-4 pl-2 text-gray-500 dark:text-zinc-400 font-medium">
                          {formattedDate}
                        </td>
                        <td className="py-4">
                          <div className="font-semibold text-gray-900 dark:text-white">{item.title}</div>
                          <div className="flex gap-2 items-center mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                              item.category === 'restock' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' : 
                              item.category === 'operasional' ? 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20' :
                              item.category === 'shipping' ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20' :
                              'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-zinc-700'
                            }`}>
                              {item.category === 'restock' ? 'Stok' : item.category === 'operasional' ? 'Ops' : item.category === 'shipping' ? 'Ongkir' : 'Lainnya'}
                            </span>
                            {item.notes && <span className="text-[11px] text-gray-400 dark:text-zinc-500">{item.notes}</span>}
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          {item.category === 'restock' ? (
                            <div className="flex flex-col items-center justify-center space-y-1">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                item.allocated_quantity === item.quantity
                                  ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                                  : item.allocated_quantity > 0
                                  ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                                  : 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20'
                              }`}>
                                {item.allocated_quantity === item.quantity 
                                  ? 'Selesai Alokasi' 
                                  : item.allocated_quantity > 0 
                                  ? 'Alokasi Sebagian' 
                                  : 'Belum Alokasi'}
                              </span>
                              <div className="w-24 bg-gray-250 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                                <div 
                                  className="bg-yellow-500 h-1 rounded-full transition-all duration-300"
                                  style={{ width: `${allocatedPercent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {item.category === 'restock' ? (
                            <>
                              <div className="font-bold text-gray-900 dark:text-white">{item.quantity} pcs</div>
                              <div className="text-[10px] text-gray-400 dark:text-zinc-500">Terinput: {item.allocated_quantity}</div>
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="py-4 text-right font-medium text-gray-500 dark:text-zinc-400">
                          {item.category === 'restock' ? `Rp ${unitPrice.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="py-4 text-right font-bold text-gray-900 dark:text-white">
                          Rp {parseFloat(item.amount).toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenModal('edit', item)}
                              className="p-1.5 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.title)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
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
        )}
      </div>

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-gray-200 dark:border-zinc-800/60">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {modalMode === 'add' ? 'Catat Pengeluaran Baru' : 'Ubah Data Pengeluaran'}
              </h3>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Kategori Pengeluaran</label>
                <select 
                  required
                  value={currentEntry.category}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setCurrentEntry(prev => ({ 
                      ...prev, 
                      category: newCat,
                      title: newCat === 'restock' ? '' : prev.title
                    }));
                  }}
                  className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
                >
                  <option value="restock">Stok Baru (Restock)</option>
                  <option value="operasional">Operasional</option>
                  <option value="shipping">Pengiriman</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              {/* Title / Product Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  {currentEntry.category === 'restock' ? 'Kategori Barang (Stok)' : 'Judul Pengeluaran'}
                </label>
                {currentEntry.category === 'restock' ? (
                  <select 
                    required
                    value={currentEntry.title}
                    onChange={(e) => setCurrentEntry(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  >
                    <option value="" disabled>Pilih Kategori Barang...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                    <option value="Lainnya">Lainnya</option>
                  </select>
                ) : (
                  <input 
                    type="text"
                    required
                    placeholder="Misal: Bayar Listrik / Beli Lakban"
                    value={currentEntry.title}
                    onChange={(e) => setCurrentEntry(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                )}
              </div>


              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Tanggal Masuk</label>
                  <input 
                    type="date"
                    required
                    value={currentEntry.expense_date}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    onChange={(e) => setCurrentEntry(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors cursor-pointer"
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                    {currentEntry.category === 'restock' ? 'Kuantitas (pcs)' : 'Kuantitas (N/A)'}
                  </label>
                  <input 
                    type="number"
                    required={currentEntry.category === 'restock'}
                    disabled={currentEntry.category !== 'restock'}
                    min="1"
                    placeholder={currentEntry.category === 'restock' ? "Jumlah fisik" : "-"}
                    value={currentEntry.category === 'restock' ? currentEntry.quantity : ''}
                    onChange={(e) => setCurrentEntry(prev => ({ ...prev, quantity: e.target.value }))}
                    className="no-spinners w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Cost (Nominal) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Total Biaya Belanja (Rp)</label>
                <input 
                  type="number"
                  required
                  min="0"
                  placeholder="Total nominal pengeluaran"
                  value={currentEntry.amount}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, amount: e.target.value }))}
                  className="no-spinners w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Catatan</label>
                <textarea 
                  placeholder="Catatan tambahan (pemasok, no faktur, dll)..."
                  value={currentEntry.notes}
                  onChange={(e) => setCurrentEntry(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-yellow-500 transition-colors min-h-[80px]"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-250 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 py-3 rounded-xl font-bold transition-all text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-xl font-bold transition-all text-xs disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
