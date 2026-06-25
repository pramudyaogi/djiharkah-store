import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, User, LogOut, HelpCircle, Store } from 'lucide-react';
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
            {/* Cart Icon */}
            <div 
              className="relative cursor-pointer group flex items-center gap-2" 
              onClick={() => navigate('/cart')}
            >
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 group-hover:border-yellow-400 group-hover:bg-white transition-all">
                <ShoppingCart size={18} className="text-zinc-600 group-hover:text-yellow-600 transition-colors" />
              </div>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-black border-2 border-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-sm">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>

            <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

            {/* Auth Area */}
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 py-1.5 px-1.5 pr-4 rounded-full">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-white font-bold text-xs">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <Link to="/profile" className="text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors">
                    {user.email.split('@')[0]}
                  </Link>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  to="/login" 
                  className="px-5 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Masuk
                </Link>
                <Link 
                  to="/register" 
                  className="px-6 py-2.5 text-sm font-bold text-white bg-zinc-900 rounded-full hover:bg-yellow-500 hover:text-black hover:shadow-md transition-all"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
