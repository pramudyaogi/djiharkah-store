import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Store, Mail, Phone, Instagram, MessageCircle } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    store_name: '',
    description: '',
    email: '',
    phone: '',
    instagram: '',
    whatsapp_text: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
        if (error) throw error;
        if (data) {
          setSettings(data);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const { error } = await supabase
        .from('store_settings')
        .update({
          store_name: settings.store_name,
          description: settings.description,
          email: settings.email,
          phone: settings.phone,
          instagram: settings.instagram,
          whatsapp_text: settings.whatsapp_text
        })
        .eq('id', 1);
        
      if (error) throw error;
      setMessage({ type: 'success', text: 'Pengaturan toko berhasil diperbarui!' });
      
      // Auto dismiss success message
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (err) {
      console.error('Error updating settings:', err);
      setMessage({ type: 'error', text: 'Gagal memperbarui pengaturan: ' + err.message });
    } finally {
      setSaving(false);
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
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-playfair font-bold text-gray-900 dark:text-gray-900 dark:text-white tracking-wide">Pengaturan Toko</h1>
        <p className="text-gray-500 dark:text-zinc-400 mt-2">
          Ubah informasi dasar toko yang akan ditampilkan kepada pelanggan di halaman depan (Customer Storefront).
        </p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} flex items-center gap-3 animate-slide-up`}>
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-zinc-800/60 p-8 shadow-soft">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bagian Kiri: Info Utama */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-emas flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800/60 pb-3">
              <Store size={20} /> Informasi Umum
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Nama Toko</label>
              <input
                type="text"
                name="store_name"
                value={settings.store_name || ''}
                onChange={handleChange}
                required
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all"
                placeholder="Contoh: Djiharkah Store"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Deskripsi (Footer)</label>
              <textarea
                name="description"
                value={settings.description || ''}
                onChange={handleChange}
                required
                rows={4}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all resize-none"
                placeholder="Tulis deskripsi singkat tentang toko Anda..."
              />
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">Deskripsi ini akan tampil di bagian bawah setiap halaman (footer).</p>
            </div>
          </div>

          {/* Bagian Kanan: Kontak & Sosial */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-emas flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800/60 pb-3">
              <Phone size={20} /> Kontak & Sosial Media
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                <Mail size={16} className="text-gray-400 dark:text-zinc-500"/> Email
              </label>
              <input
                type="email"
                name="email"
                value={settings.email || ''}
                onChange={handleChange}
                required
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                <Phone size={16} className="text-gray-400 dark:text-zinc-500"/> Nomor Telepon (WhatsApp)
              </label>
              <input
                type="text"
                name="phone"
                value={settings.phone || ''}
                onChange={handleChange}
                required
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all"
                placeholder="+62 812..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                <Instagram size={16} className="text-gray-400 dark:text-zinc-500"/> Instagram Username
              </label>
              <input
                type="text"
                name="instagram"
                value={settings.instagram || ''}
                onChange={handleChange}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all"
                placeholder="@username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                <MessageCircle size={16} className="text-gray-400 dark:text-zinc-500"/> Label WhatsApp
              </label>
              <input
                type="text"
                name="whatsapp_text"
                value={settings.whatsapp_text || ''}
                onChange={handleChange}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all"
                placeholder="Contoh: Chat Admin"
              />
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-zinc-800/60 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-glow hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={20} />
            )}
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
}
