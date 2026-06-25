import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import { Mail, Phone, Instagram, MessageCircle } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <Navbar />
      <main className="flex-grow w-full pb-16">
        <Outlet />
      </main>
      
      {/* Footer Hitam-Emas 4 Kolom */}
      <footer className="bg-[#111111] border-t-4 border-emas text-gray-400 pt-16 pb-8 text-sm">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-gray-800 pb-12">
            
            {/* Kolom 1: Tentang */}
            <div>
              <h3 className="text-white font-bold mb-6 text-lg font-playfair uppercase tracking-wider">Djiharkah Store</h3>
              <p className="leading-relaxed mb-4">
                Pusat busana muslim eksklusif yang menyajikan kemewahan dan kenyamanan dalam setiap helai kain untuk menyempurnakan ibadah Anda.
              </p>
            </div>
            
            {/* Kolom 2: Tautan */}
            <div>
              <h3 className="text-white font-bold mb-6 text-base uppercase tracking-wider">Tautan Cepat</h3>
              <ul className="space-y-3">
                <li><Link to="/" className="hover:text-emas transition-colors">Beranda</Link></li>
                <li><Link to="/products" className="hover:text-emas transition-colors">Koleksi Produk</Link></li>
                <li><Link to="/about" className="hover:text-emas transition-colors">Tentang Kami</Link></li>
                <li><Link to="/contact" className="hover:text-emas transition-colors">Kontak</Link></li>
              </ul>
            </div>
            
            {/* Kolom 3: Kontak */}
            <div>
              <h3 className="text-white font-bold mb-6 text-base uppercase tracking-wider">Hubungi Kami</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 hover:text-emas transition-colors cursor-pointer">
                  <Mail className="text-emas mt-0.5" size={18} />
                  <span>support@djiharkah.com</span>
                </li>
                <li className="flex items-start gap-3 hover:text-emas transition-colors cursor-pointer">
                  <Phone className="text-emas mt-0.5" size={18} />
                  <span>+62 812 3456 7890</span>
                </li>
              </ul>
            </div>
            
            {/* Kolom 4: Sosial Media */}
            <div>
              <h3 className="text-white font-bold mb-6 text-base uppercase tracking-wider">Sosial Media</h3>
              <ul className="space-y-4">
                <li>
                  <a href="#" className="flex items-center gap-3 hover:text-emas transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-emas">
                      <Instagram size={16} />
                    </div>
                    <span>@djiharkah.store</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 hover:text-emas transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-emas">
                      <MessageCircle size={16} />
                    </div>
                    <span>WhatsApp Kami</span>
                  </a>
                </li>
              </ul>
            </div>
            
          </div>
          <div className="text-center text-xs text-gray-600">
            <p>&copy; {new Date().getFullYear()} Djiharkah Store. Hak Cipta Dilindungi Undang-Undang.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
