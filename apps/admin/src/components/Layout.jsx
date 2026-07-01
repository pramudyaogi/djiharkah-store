import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LayoutDashboard, ShoppingCart, Package, LogOut, Tags, Star, Settings, Sun, Moon, Menu, X, BarChart2, Truck, Percent } from 'lucide-react';

export default function Layout() {
  const { logout, user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Orders', path: '/orders', icon: ShoppingCart },
    { name: 'Products & Categories', path: '/products', icon: Package },
    { name: 'Promo & Eksklusif', path: '/promotions', icon: Percent },
    { name: 'Reviews', path: '/reviews', icon: Star },
    { name: 'Laporan Penjualan', path: '/sales', icon: BarChart2 },
    { name: 'Pengaturan Ongkir', path: '/shipping', icon: Truck },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-zinc-800 transition-colors duration-300">
        <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-400 dark:to-yellow-600 tracking-wider">
          DJIHARKAH
        </span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 font-semibold shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-zinc-200'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-yellow-500' : 'text-gray-400 dark:text-zinc-500'} />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </>
  );

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 transition-colors duration-300 overflow-hidden">

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop always visible, Mobile as drawer */}
      <aside className={`
        fixed md:relative z-50 md:z-auto
        w-64 h-full bg-gray-50 dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 shadow-xl flex flex-col transition-all duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between px-4 md:px-8 relative z-10 transition-colors duration-300 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-base md:text-xl font-semibold text-gray-900 dark:text-zinc-100 tracking-tight transition-colors duration-300">
              {navItems.find(i => i.path === location.pathname)?.name || 'Admin Panel'}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors shadow-sm"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-sm shadow-md">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 hidden lg:block transition-colors duration-300 max-w-[150px] truncate">{user?.email}</span>
            </div>
            <div className="h-6 w-px bg-gray-300 dark:bg-zinc-700 transition-colors duration-300 hidden sm:block"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/10 dark:bg-yellow-900/5 blur-[100px] rounded-full pointer-events-none transition-colors duration-300"></div>
          
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
