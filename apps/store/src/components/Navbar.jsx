import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/products');
    }
  };

  const handleMobileSearch = (e) => {
    e.preventDefault();
    if (mobileSearchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(mobileSearchQuery.trim())}`);
    } else {
      navigate('/products');
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-zinc-950 sticky top-0 z-50 shadow-lg border-b border-yellow-900/30">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <img
              src="/Logo DS.png"
              alt="Djiharkah Store Logo"
              className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover shadow-md group-hover:scale-105 transition-transform duration-200"
            />
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-bold font-playfair text-white leading-none tracking-tight">Djiharkah</span>
              <span className="text-[9px] md:text-[10px] text-yellow-500 font-bold tracking-[0.3em] ml-0.5 mt-0.5 uppercase">Store</span>
            </div>
          </Link>

          {/* Search Bar - Desktop only */}
          <div className="flex-1 max-w-2xl hidden md:flex">
            <form onSubmit={handleSearch} className="flex w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700 focus-within:border-yellow-500 focus-within:bg-zinc-700 transition-all">
              <div className="pl-5 flex items-center justify-center">
                <Search size={18} className="text-zinc-400" />
              </div>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari koleksi sarung premium..." 
                className="w-full px-4 py-3 bg-transparent text-white placeholder-zinc-400 focus:outline-none text-sm"
              />
              <button type="submit" className="bg-white hover:bg-gray-100 text-black px-6 font-bold transition-colors text-sm">
                Cari
              </button>
            </form>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-6 shrink-0">
            {/* Desktop Links */}
            <Link to="/track-order" className="text-sm font-bold text-zinc-300 hover:text-yellow-400 transition-colors hidden md:block">
              Lacak Pesanan
            </Link>

            {/* Mobile: Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pb-3 border-t border-zinc-800 pt-3 space-y-3">
            {/* Mobile Search */}
            <form onSubmit={handleMobileSearch} className="flex bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 focus-within:border-yellow-500 transition-all">
              <div className="pl-4 flex items-center">
                <Search size={16} className="text-zinc-400" />
              </div>
              <input 
                type="text"
                value={mobileSearchQuery}
                onChange={(e) => setMobileSearchQuery(e.target.value)}
                placeholder="Cari sarung premium..." 
                className="w-full px-3 py-2.5 bg-transparent text-white placeholder-zinc-400 focus:outline-none text-sm"
              />
              <button type="submit" className="bg-white hover:bg-gray-100 text-black px-4 font-bold transition-colors text-sm">
                Cari
              </button>
            </form>
            {/* Mobile Links */}
            <div className="flex flex-col gap-1">
              <Link
                to="/track-order"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-yellow-400 transition-colors"
              >
                🔍 Lacak Pesanan
              </Link>
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-yellow-400 transition-colors"
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
