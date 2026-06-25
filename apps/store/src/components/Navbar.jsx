import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, User, LogOut, Bell, HelpCircle, Store } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import useCartStore from '../store/useCartStore';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cartItems = useCartStore(state => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-hitam sticky top-0 z-50 shadow-md">
      {/* Top Tier (Thin) */}
      <div className="bg-hitam-gelap border-b border-emas/20 py-1 hidden sm:block">
        <div className="max-w-[1200px] mx-auto px-4 flex justify-between text-xs text-gray-300">
          <div className="flex gap-4">
            <Link to="/seller" className="hover:text-emas transition-colors flex items-center gap-1"><Store size={12}/> Mulai Jual</Link>
            <span className="text-gray-600">|</span>
            <a href="#" className="hover:text-emas transition-colors">Download</a>
            <span className="text-gray-600">|</span>
            <span className="flex items-center gap-2">Ikuti kami di: <span className="text-emas cursor-pointer">Instagram</span></span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-emas transition-colors flex items-center gap-1"><Bell size={12}/> Notifikasi</a>
            <a href="#" className="hover:text-emas transition-colors flex items-center gap-1"><HelpCircle size={12}/> Bantuan</a>
            <span className="text-gray-600">|</span>
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="font-medium text-emas hover:text-emas-terang transition-colors flex items-center gap-1">
                  <User size={12} /> {user.email}
                </Link>
                <button onClick={handleLogout} className="hover:text-red-400 transition-colors flex items-center gap-1">
                  <LogOut size={12} /> Keluar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/register" className="font-medium hover:text-emas transition-colors">Daftar</Link>
                <span className="text-gray-600">|</span>
                <Link to="/login" className="font-medium hover:text-emas transition-colors">Login</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Bar (Sticky) */}
      <div className="max-w-[1200px] mx-auto px-4 py-4">
        <div className="flex items-center gap-8">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Store className="text-emas" size={36} />
            <div className="flex flex-col">
              <span className="text-2xl font-bold font-playfair text-emas leading-none tracking-wide">Djiharkah</span>
              <span className="text-xs text-white tracking-[0.2em] ml-0.5">STORE</span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 flex flex-col">
            <div className="flex w-full bg-white rounded-sm overflow-hidden border-2 border-emas focus-within:shadow-[0_0_8px_rgba(212,168,73,0.6)] transition-shadow">
              <input 
                type="text" 
                placeholder="Cari Sarung BHS, Gajah Duduk, atau lainnya..." 
                className="w-full px-4 py-2 text-hitam focus:outline-none"
              />
              <button className="bg-emas hover:bg-emas-terang px-6 flex items-center justify-center transition-colors">
                <Search size={20} className="text-hitam" />
              </button>
            </div>
            <div className="flex gap-3 text-[11px] text-gray-400 mt-1.5 ml-1">
              <span className="hover:text-emas cursor-pointer">Sarung BHS</span>
              <span className="hover:text-emas cursor-pointer">Wadimor</span>
              <span className="hover:text-emas cursor-pointer">Atlas Premium</span>
              <span className="hover:text-emas cursor-pointer">Gajah Duduk</span>
            </div>
          </div>

          {/* Cart Icon */}
          <div className="shrink-0 relative mr-4 cursor-pointer hover:scale-110 transition-transform" onClick={() => navigate('/cart')}>
            <ShoppingCart size={32} className="text-emas" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-white text-hitam border border-emas text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>
          
        </div>
      </div>
    </nav>
  );
}
