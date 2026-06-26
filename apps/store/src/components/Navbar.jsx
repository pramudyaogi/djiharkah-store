import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Store, Menu, X } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-zinc-900 flex items-center justify-center shadow-md group-hover:bg-yellow-500 transition-colors">
              <Store className="text-white group-hover:text-black transition-colors" size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-bold font-playfair text-zinc-900 leading-none tracking-tight">Djiharkah</span>
              <span className="text-[9px] md:text-[10px] text-yellow-600 font-bold tracking-[0.3em] ml-0.5 mt-0.5 uppercase">Store</span>
            </div>
          </Link>

          {/* Search Bar - Desktop only */}
          <div className="flex-1 max-w-2xl hidden md:flex">
            <div className="flex w-full bg-gray-50 rounded-full overflow-hidden border border-gray-200 focus-within:border-yellow-400 focus-within:bg-white transition-all shadow-inner">
              <div className="pl-5 flex items-center justify-center">
                <Search size={18} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Cari koleksi sarung premium..." 
                className="w-full px-4 py-3 bg-transparent text-zinc-800 placeholder-gray-400 focus:outline-none text-sm"
              />
              <button className="bg-zinc-900 hover:bg-yellow-500 hover:text-black text-white px-6 font-medium transition-colors text-sm">
                Cari
              </button>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-6 shrink-0">
            {/* Desktop Links */}
            <Link to="/track-order" className="text-sm font-bold text-zinc-600 hover:text-yellow-600 transition-colors hidden md:block">
              Lacak Pesanan
            </Link>

            {/* Mobile: Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
            {/* Mobile Search */}
            <div className="flex bg-gray-50 rounded-xl overflow-hidden border border-gray-200 focus-within:border-yellow-400 focus-within:bg-white transition-all">
              <div className="pl-4 flex items-center">
                <Search size={16} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Cari sarung premium..." 
                className="w-full px-3 py-2.5 bg-transparent text-zinc-800 placeholder-gray-400 focus:outline-none text-sm"
              />
            </div>
            {/* Mobile Links */}
            <div className="flex flex-col gap-1">
              <Link
                to="/track-order"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-700 hover:bg-gray-100 hover:text-yellow-600 transition-colors"
              >
                🔍 Lacak Pesanan
              </Link>
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-700 hover:bg-gray-100 hover:text-yellow-600 transition-colors"
              >
                🛍️ Koleksi Produk
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
