import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Save, MapPin, Plus, Trash2, Edit2, X, Check, Truck, Search } from 'lucide-react';

export default function ShippingSettings() {
  const [originCity, setOriginCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingOrigin, setSavingOrigin] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // States for Shipping Rates
  const [rates, setRates] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [newRate, setNewRate] = useState({ province: '', cost: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingCost, setEditingCost] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRates = async () => {
    setRatesLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipping_rates')
        .select('*')
        .order('province', { ascending: true });
      if (error) throw error;
      setRates(data || []);
    } catch (err) {
      console.error('Error fetching shipping rates:', err);
    } finally {
      setRatesLoading(false);
    }
  };

  const fetchOrigin = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('shipping_origin_city')
        .eq('id', 1)
        .single();
      if (error) throw error;
      if (data) {
        setOriginCity(data.shipping_origin_city || '');
      }
    } catch (err) {
      console.error('Error fetching origin city:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrigin();
    fetchRates();
  }, []);

  const handleSaveOrigin = async (e) => {
    e.preventDefault();
    setSavingOrigin(true);
    setMessage({ type: '', text: '' });
    
    try {
      const { error } = await supabase
        .from('store_settings')
        .update({ shipping_origin_city: originCity })
        .eq('id', 1);
        
      if (error) throw error;
      setMessage({ type: 'success', text: 'Kota asal pengiriman berhasil disimpan!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Error updating origin city:', err);
      setMessage({ type: 'error', text: 'Gagal menyimpan kota asal: ' + err.message });
    } finally {
      setSavingOrigin(false);
    }
  };

  const handleAddRate = async (e) => {
    e.preventDefault();
    if (!newRate.province.trim() || !newRate.cost) return;
    try {
      const { data, error } = await supabase
        .from('shipping_rates')
        .insert([{ province: newRate.province.trim(), cost: parseFloat(newRate.cost) }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        setRates(prev => [...prev, data[0]].sort((a, b) => a.province.localeCompare(b.province)));
      }
      setNewRate({ province: '', cost: '' });
      setMessage({ type: 'success', text: 'Tarif ongkir baru berhasil ditambahkan!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Error adding shipping rate:', err);
      setMessage({ type: 'error', text: 'Gagal menambahkan tarif: ' + err.message });
    }
  };

  const handleDeleteRate = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus tarif ongkir untuk provinsi ini?')) return;
    try {
      const { error } = await supabase
        .from('shipping_rates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setRates(prev => prev.filter(r => r.id !== id));
      setMessage({ type: 'success', text: 'Tarif ongkir berhasil dihapus!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Error deleting shipping rate:', err);
      setMessage({ type: 'error', text: 'Gagal menghapus tarif: ' + err.message });
    }
  };

  const handleUpdateRate = async (id) => {
    if (!editingCost) return;
    try {
      const { error } = await supabase
        .from('shipping_rates')
        .update({ cost: parseFloat(editingCost) })
        .eq('id', id);
      if (error) throw error;
      setRates(prev => prev.map(r => r.id === id ? { ...r, cost: parseFloat(editingCost) } : r));
      setEditingId(null);
      setEditingCost('');
      setMessage({ type: 'success', text: 'Tarif ongkir berhasil diperbarui!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Error updating shipping rate:', err);
      setMessage({ type: 'error', text: 'Gagal memperbarui tarif: ' + err.message });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-playfair font-bold text-gray-900 dark:text-white tracking-wide">Pengaturan Pengiriman</h1>
        <p className="text-gray-500 dark:text-zinc-400 mt-2">
          Atur kota asal pengiriman toko Anda dan kelola tarif ongkos kirim per provinsi.
        </p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} flex items-center gap-3 animate-slide-up`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Kolom Kiri: Kota Asal & Form Tambah Provinsi */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Box 1: Kota Asal Toko */}
          <div className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-zinc-800/60 p-6 shadow-soft">
            <h3 className="text-lg font-bold text-emas mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800/60 pb-3">
              <MapPin size={20} /> Lokasi Asal Toko
            </h3>
            
            <form onSubmit={handleSaveOrigin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Kota Asal (Pengiriman)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 text-gray-400" size={16} />
                  <input
                    type="text"
                    required
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                    placeholder="Contoh: Jakarta Barat"
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all"
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
                  Nama kota asal pengiriman ini disinkronkan ke halaman detail produk pembeli (*"Dikirim dari"*).
                </p>
              </div>
              
              <button
                type="submit"
                disabled={savingOrigin}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-glow hover:-translate-y-0.5"
              >
                {savingOrigin ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save size={18} />
                )}
                Simpan Lokasi
              </button>
            </form>
          </div>

          {/* Box 2: Form Tambah Provinsi */}
          <div className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-zinc-800/60 p-6 shadow-soft">
            <h3 className="text-lg font-bold text-emas mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800/60 pb-3">
              <Plus size={20} /> Tambah Provinsi
            </h3>
            
            <form onSubmit={handleAddRate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Nama Provinsi</label>
                <input
                  type="text"
                  required
                  value={newRate.province}
                  onChange={(e) => setNewRate(prev => ({ ...prev, province: e.target.value }))}
                  placeholder="Contoh: Jawa Timur"
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Tarif Ongkir (Rp)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newRate.cost}
                  onChange={(e) => setNewRate(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="Contoh: 15000"
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-glow hover:-translate-y-0.5"
              >
                <Plus size={18} /> Tambah Tarif
              </button>
            </form>
          </div>
        </div>

        {/* Kolom Kanan: Tabel Tarif */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-zinc-800/60 p-6 shadow-soft">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-2">
                <Truck size={20} className="text-emas" /> Daftar Tarif Pengiriman
              </h3>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Cari provinsi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all"
                  />
                </div>
                <span className="text-xs bg-gray-100 dark:bg-zinc-800 px-3 py-2 rounded-xl text-gray-500 font-bold shrink-0">
                  {rates.filter(rate => rate.province.toLowerCase().includes(searchQuery.toLowerCase())).length} Dari {rates.length}
                </span>
              </div>
            </div>

            {ratesLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-8 h-8 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : rates.filter(rate => rate.province.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Tidak ada provinsi yang cocok dengan pencarian Anda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-zinc-800 text-sm font-bold text-gray-500 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Provinsi</th>
                      <th className="pb-3 text-right">Tarif Ongkir</th>
                      <th className="pb-3 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm">
                    {rates
                      .filter(rate => rate.province.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="py-4 pl-2 font-medium text-gray-900 dark:text-white">
                          {rate.province}
                        </td>
                        <td className="py-4 text-right font-bold text-gray-900 dark:text-white">
                          {editingId === rate.id ? (
                            <input
                              type="number"
                              min="0"
                              value={editingCost}
                              onChange={(e) => setEditingCost(e.target.value)}
                              className="w-28 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-right focus:outline-none focus:border-emas"
                            />
                          ) : (
                            `Rp ${Number(rate.cost).toLocaleString('id-ID')}`
                          )}
                        </td>
                        <td className="py-4 text-center">
                          <div className="flex justify-center gap-2">
                            {editingId === rate.id ? (
                              <>
                                <button
                                  onClick={() => handleUpdateRate(rate.id)}
                                  className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
                                  title="Simpan"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingCost('');
                                  }}
                                  className="p-1.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-500 rounded-lg transition-colors"
                                  title="Batal"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingId(rate.id);
                                    setEditingCost(rate.cost);
                                  }}
                                  className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRate(rate.id)}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
