import React, { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import { Mail, Phone, Instagram, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Layout() {
  const [storeSettings, setStoreSettings] = useState({
    store_name: 'Djiharkah Store',
    description: 'Pusat busana muslim eksklusif yang menyajikan kemewahan dan kenyamanan dalam setiap helai kain untuk menyempurnakan ibadah Anda.',
    email: 'support@djiharkah.com',
    phone: '+62 812 3456 7890',
    instagram: '@djiharkah.store',
    whatsapp_text: 'WhatsApp Kami'
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
    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7]">
      <Navbar />
      <main className="flex-grow w-full pb-16">
        <Outlet />
      </main>
      
      {/* Footer yang lebih halus dan modern */}
      <footer className="bg-gradient-to-b from-hitam to-hitam-gelap text-zinc-400 pt-20 pb-8 text-sm border-t border-zinc-800">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-16">
            
            {/* Kolom 1: Tentang */}
            <div className="pr-4">
              <h3 className="text-white font-bold mb-6 text-xl font-playfair uppercase tracking-widest">{storeSettings.store_name}</h3>
              <p className="leading-relaxed mb-4 text-zinc-400">
                {storeSettings.description}
              </p>
            </div>
            
            {/* Kolom 2: Tautan */}
            <div>
              <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Tautan Cepat</h3>
              <ul className="space-y-4">
                <li><Link to="/" className="hover:text-emas hover:translate-x-1 inline-block transition-all duration-300">Beranda</Link></li>
                <li><Link to="/products" className="hover:text-emas hover:translate-x-1 inline-block transition-all duration-300">Koleksi Produk</Link></li>
                <li><Link to="/about" className="hover:text-emas hover:translate-x-1 inline-block transition-all duration-300">Tentang Kami</Link></li>
                <li><Link to="/contact" className="hover:text-emas hover:translate-x-1 inline-block transition-all duration-300">Kontak</Link></li>
              </ul>
            </div>
            
            {/* Kolom 3: Kontak */}
            <div>
              <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Hubungi Kami</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 hover:text-emas transition-colors duration-300 cursor-pointer group">
                  <div className="mt-0.5 p-1.5 rounded-full bg-zinc-800 group-hover:bg-emas/20 transition-colors">
                    <Mail className="text-emas" size={16} />
                  </div>
                  <span className="mt-1">{storeSettings.email}</span>
                </li>
                <li className="flex items-start gap-3 hover:text-emas transition-colors duration-300 cursor-pointer group">
                  <div className="mt-0.5 p-1.5 rounded-full bg-zinc-800 group-hover:bg-emas/20 transition-colors">
                    <Phone className="text-emas" size={16} />
                  </div>
                  <span className="mt-1">{storeSettings.phone}</span>
                </li>
              </ul>
            </div>
            
            {/* Kolom 4: Sosial Media */}
            <div>
              <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Sosial Media</h3>
              <ul className="space-y-4">
                <li>
                  <a href="#" className="flex items-center gap-3 hover:text-emas transition-colors duration-300 group">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-emas group-hover:bg-emas group-hover:text-black transition-all shadow-soft">
                      <Instagram size={18} />
                    </div>
                    <span>{storeSettings.instagram}</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 hover:text-emas transition-colors duration-300 group">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-emas group-hover:bg-emas group-hover:text-black transition-all shadow-soft">
                      <MessageCircle size={18} />
                    </div>
                    <span>{storeSettings.whatsapp_text}</span>
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
    </div>
  );
}
