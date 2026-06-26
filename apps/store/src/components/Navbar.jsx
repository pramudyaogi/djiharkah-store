import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Store } from 'lucide-react';
export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-8">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shadow-md group-hover:bg-yellow-500 transition-colors">
              <Store className="text-white group-hover:text-black transition-colors" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-playfair text-zinc-900 leading-none tracking-tight">Djiharkah</span>
              <span className="text-[10px] text-yellow-600 font-bold tracking-[0.3em] ml-0.5 mt-0.5 uppercase">Store</span>
            </div>
          </Link>

          {/* Search Bar - Sleek & Modern */}
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

          {/* Right Section: Actions */}
          <div className="flex items-center gap-6 shrink-0">
            {/* Links Area */}
            <div className="flex items-center gap-3">
              <Link to="/track-order" className="text-sm font-bold text-zinc-600 hover:text-yellow-600 transition-colors mr-2">
                Lacak Pesanan
              </Link>
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
}
