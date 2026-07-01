import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Store, Mail, Phone, Instagram, MessageCircle, ChevronDown, Search } from 'lucide-react';

const TiktokIcon = ({ size = 16, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const countryCodesList = [
  { name: 'Indonesia', code: '+62', flag: '🇮🇩' },
  { name: 'Malaysia', code: '+60', flag: '🇲🇾' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'Brunei', code: '+673', flag: '🇧🇳' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
];

function parsePhone(phoneStr) {
  if (!phoneStr) return { country: countryCodesList[0], local: '' };
  
  const cleanPhone = phoneStr.trim().replace(/\s+/g, ' ');
  const sortedCountries = [...countryCodesList].sort((a, b) => b.code.length - a.code.length);
  
  for (const c of sortedCountries) {
    if (cleanPhone.startsWith(c.code)) {
      const local = cleanPhone.substring(c.code.length).trim().replace(/[-\s]/g, '');
      return { country: c, local };
    }
  }
  
  if (cleanPhone.startsWith('0')) {
    return { country: countryCodesList[0], local: cleanPhone.substring(1) };
  } else if (cleanPhone.startsWith('62')) {
    return { country: countryCodesList[0], local: cleanPhone.substring(2) };
  }
  
  return { country: countryCodesList[0], local: cleanPhone };
}

export default function Settings() {
  const [settings, setSettings] = useState({
    store_name: '',
    description: '',
    email: '',
    phone: '',
    instagram: '',
    whatsapp_text: '',
    tiktok: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [selectedCountry, setSelectedCountry] = useState(countryCodesList[0]);
  const [localPhone, setLocalPhone] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
        if (error) throw error;
        if (data) {
          setSettings(data);
          const parsed = parsePhone(data.phone);
          setSelectedCountry(parsed.country);
          setLocalPhone(parsed.local);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDropdown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleLocalPhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, ''); // Hanya simpan angka
    if (val.startsWith('0')) {
      val = val.substring(1);
    }
    setLocalPhone(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    const combinedPhone = `${selectedCountry.code} ${localPhone}`;
    
    try {
      const { error } = await supabase
        .from('store_settings')
        .update({
          store_name: settings.store_name,
          description: settings.description,
          email: settings.email,
          phone: combinedPhone,
          instagram: settings.instagram,
          whatsapp_text: settings.whatsapp_text,
          tiktok: settings.tiktok
        })
        .eq('id', 1);
        
      if (error) throw error;
      setSettings(prev => ({ ...prev, phone: combinedPhone }));
      setMessage({ type: 'success', text: 'Pengaturan toko berhasil diperbarui!' });
      
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

  const filteredCountries = countryCodesList.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.includes(searchTerm)
  );

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
        <h1 className="text-3xl font-playfair font-bold text-gray-900 dark:text-white tracking-wide">Pengaturan Toko</h1>
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
              <div className="flex gap-2 relative" ref={dropdownRef}>
                {/* Country Code Selector */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all h-full"
                  >
                    <span className="text-base">{selectedCountry.flag}</span>
                    <span className="font-semibold text-sm">{selectedCountry.code}</span>
                    <ChevronDown size={14} className="text-gray-400 dark:text-zinc-500" />
                  </button>
                  
                  {showDropdown && (
                    <div className="absolute left-0 mt-2 w-60 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="p-2 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-2 bg-gray-50 dark:bg-zinc-950">
                        <Search size={14} className="text-gray-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Cari negara..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-transparent text-xs text-gray-900 dark:text-white outline-none"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto py-1">
                        {filteredCountries.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(c);
                              setShowDropdown(false);
                              setSearchTerm('');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-sm text-gray-900 dark:text-white transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-base">{c.flag}</span>
                              <span className="truncate max-w-[110px]">{c.name}</span>
                            </span>
                            <span className="text-gray-400 font-mono text-xs">{c.code}</span>
                          </button>
                        ))}
                        {filteredCountries.length === 0 && (
                          <div className="px-3 py-2 text-xs text-gray-400 text-center">Negara tidak ditemukan</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Local Phone Input */}
                <input
                  type="text"
                  value={localPhone}
                  onChange={handleLocalPhoneChange}
                  required
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all font-semibold font-mono tracking-wide"
                  placeholder="Contoh: 8083279808"
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
                Format tersimpan: <span className="font-semibold text-gray-600 dark:text-zinc-400">{selectedCountry.code} {localPhone || '...'}</span>
              </p>
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
                <TiktokIcon size={16} className="text-gray-400 dark:text-zinc-500"/> TikTok Username
              </label>
              <input
                type="text"
                name="tiktok"
                value={settings.tiktok || ''}
                onChange={handleChange}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all"
                placeholder="@username"
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
