import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { Mail, Phone, Instagram, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

export default function Layout() {
  const location = useLocation();
  const currentPath = location.pathname;

  // Sembunyikan tombol WhatsApp melayang di halaman detail produk, checkout, dan lacak pesanan
  const shouldHideWhatsApp = 
    currentPath.startsWith('/products/') || 
    currentPath === '/checkout' || 
    currentPath === '/track-order';

  const [storeSettings, setStoreSettings] = useState({
    store_name: 'Djiharkah Store',
    description: 'Pusat busana muslim eksklusif yang menyajikan kemewahan dan kenyamanan dalam setiap helai kain untuk menyempurnakan ibadah Anda.',
    email: 'support@djiharkah.com',
    phone: '+62 812 3456 7890',
    instagram: '@djiharkah.store',
    whatsapp_text: 'WhatsApp Kami',
    tiktok: '@djiharkah.store'
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
        if (data && !error) {
          setStoreSettings(data);
        }
      } catch (err) {
        console.error('Failed to fetch store settings:', err);
      }
    }
    async function autoCompleteShippedOrders() {
      try {
        await supabase.rpc('auto_complete_orders');
      } catch (err) {
        console.error('Failed to auto complete old shipped orders:', err);
      }
    }
    fetchSettings();
    autoCompleteShippedOrders();
  }, []);

  const cleanPhoneForWhatsApp = (phoneStr) => {
    if (!phoneStr) return '';
    let cleaned = phoneStr.replace(/\D/g, ''); // bersihkan non-angka
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    return cleaned;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7]">
      <Navbar />
      <main className="flex-grow w-full pb-16">
        <Outlet />
      </main>
      
      {/* Footer yang lebih halus dan modern */}
      <footer className="bg-gradient-to-b from-hitam to-hitam-gelap text-zinc-400 pt-20 pb-8 text-sm border-t border-zinc-800">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
            
            {/* Kolom 1: Tentang */}
            <div className="pr-4">
              <h3 className="text-white font-bold mb-6 text-xl font-playfair uppercase tracking-widest">{storeSettings.store_name}</h3>
              <p className="leading-relaxed mb-4 text-zinc-400">
                {storeSettings.description}
              </p>
            </div>
            
            {/* Kolom 2: Kontak (Hubungi Kami) */}
            <div>
              <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Hubungi Kami</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 hover:text-emas transition-colors duration-300 group">
                  <div className="mt-0.5 p-1.5 rounded-full bg-zinc-800 group-hover:bg-emas/20 transition-colors">
                    <Mail className="text-emas" size={16} />
                  </div>
                  <a href={`mailto:${storeSettings.email}`} className="mt-1">{storeSettings.email}</a>
                </li>
                <li className="flex items-start gap-3 hover:text-emas transition-colors duration-300 group">
                  <div className="mt-0.5 p-1.5 rounded-full bg-zinc-800 group-hover:bg-emas/20 transition-colors">
                    <MessageCircle className="text-emas" size={16} />
                  </div>
                  <a
                    href={`https://wa.me/${cleanPhoneForWhatsApp(storeSettings.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1"
                  >
                    {storeSettings.phone}
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Kolom 3: Sosial Media */}
            <div>
              <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Sosial Media</h3>
              <ul className="space-y-4">
                <li>
                  <a
                    href={storeSettings.instagram ? `https://instagram.com/${storeSettings.instagram.replace('@', '')}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 hover:text-emas transition-colors duration-300 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-emas group-hover:bg-emas group-hover:text-black transition-all shadow-soft">
                      <Instagram size={18} />
                    </div>
                    <span>{storeSettings.instagram}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={storeSettings.tiktok ? `https://tiktok.com/@${storeSettings.tiktok.replace('@', '')}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 hover:text-emas transition-colors duration-300 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-emas group-hover:bg-emas group-hover:text-black transition-all shadow-soft">
                      <TiktokIcon size={18} />
                    </div>
                    <span>{storeSettings.tiktok || '@djiharkah.store'}</span>
                  </a>
                </li>
              </ul>
            </div>
            
          </div>
          
          <div className="pt-8 border-t border-zinc-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
            <p>&copy; {new Date().getFullYear()} {storeSettings.store_name}. Hak Cipta Dilindungi Undang-Undang.</p>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-zinc-300 transition-colors">Kebijakan Privasi</Link>
              <Link to="/terms" className="hover:text-zinc-300 transition-colors">Syarat & Ketentuan</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      {storeSettings.phone && !shouldHideWhatsApp && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          {/* Speech Bubble */}
          <div className="flex items-center animate-float-gentle">
            <div className="bg-white text-zinc-800 text-[10px] sm:text-xs font-semibold px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] border border-zinc-100 relative whitespace-nowrap">
              Tanyakan apapun via WhatsApp
              {/* Arrow pointer */}
              <div className="w-2.5 h-2.5 bg-white border-t border-r border-zinc-100 rotate-45 absolute right-[-5px] top-1/2 -translate-y-1/2"></div>
            </div>
          </div>

          <a
            href={`https://wa.me/${cleanPhoneForWhatsApp(storeSettings.phone)}?text=${encodeURIComponent("Assalamualaikum Djiharkah Store.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white hover:bg-zinc-50 text-zinc-800 p-3.5 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-zinc-200/80 hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center group relative"
            title="Hubungi Kami via WhatsApp"
          >
            {/* Custom SVG Icon for WhatsApp */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-7 h-7 text-zinc-800"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
            </svg>
            
            {/* Tooltip on hover */}
            <span className="absolute right-16 scale-0 group-hover:scale-100 transition-all duration-200 bg-black text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-90 pointer-events-none">
              Hubungi WhatsApp
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
