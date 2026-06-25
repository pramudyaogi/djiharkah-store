import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, LogOut, ShoppingCart, Search } from 'lucide-react';
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
    <nav className="bg-hitam border-b border-emas/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <ShoppingBag className="text-emas" size={32} />
            <span className="text-2xl font-bold font-playfair text-emas tracking-wider">Djiharkah Store</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-emas hover:text-emas-terang transition-colors font-medium">Home</Link>
            <Link to="/products" className="text-emas hover:text-emas-terang transition-colors font-medium">Produk</Link>
          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Cari produk..." 
                className="w-full bg-white border border-emas rounded-full py-2 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-emas-terang text-hitam placeholder-gray-400"
              />
              <Search className="absolute right-3 top-2.5 text-emas" size={20} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <Link to="/cart" className="text-emas hover:text-emas-terang transition-colors relative">
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-emas text-hitam text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-4 border-l border-emas/30 pl-6">
                <Link to="/profile" className="flex items-center gap-2 text-sm font-medium text-emas hover:text-emas-terang transition-colors">
                  <User size={18} />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm font-medium text-emas hover:text-emas-terang transition-colors"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 border-l border-emas/30 pl-6">
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-emas border border-emas rounded-lg hover:bg-emas hover:text-hitam transition-all">
                  Login
                </Link>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </nav>
  );
}
