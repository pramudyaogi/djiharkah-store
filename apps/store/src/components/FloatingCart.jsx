import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useTranslation } from '../utils/translations';
import useCurrencyStore from '../store/useCurrencyStore';
import { formatPrice } from '../utils/currencyHelper';

export default function FloatingCart() {
  const { cartItems, cartTotalItems, setIsCartOpen } = useCart();
  const { currency, rates } = useCurrencyStore();
  const { t } = useTranslation();
  const { pathname } = useLocation();

  if (pathname === '/checkout' || cartItems.length === 0) return null;

  const totalSubtotal = cartItems.reduce((total, item) => {
    const promoSubtotal = item.promoQty * item.promoPrice;
    const normalSubtotal = item.normalQty * item.normalPrice;
    return total + promoSubtotal + normalSubtotal;
  }, 0);

  return (
    <button 
      onClick={() => setIsCartOpen(true)}
      className="fixed bottom-6 inset-x-0 mx-auto w-[90%] max-w-sm bg-hitam text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between z-40 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(24,24,27,0.4)] transition-all duration-300 group border border-zinc-800 animate-[slideUp_0.4s_ease-out_forwards]"
      style={{ animationName: 'slideUp', animationDuration: '0.4s', animationTimingFunction: 'ease-out' }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div className="flex items-center gap-3">
        <div className="bg-emas/20 p-2.5 rounded-xl text-emas relative">
          <ShoppingBag size={20} />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-hitam">
            {cartTotalItems}
          </span>
        </div>
        <div className="text-left">
          <p className="text-xs text-gray-400 font-medium">Total ({cartTotalItems} barang)</p>
          <p className="font-bold text-emas">{formatPrice(totalSubtotal, currency, rates)}</p>
        </div>
      </div>
      
      <div className="text-sm font-semibold flex items-center gap-1 group-hover:text-emas transition-colors">
        Lihat Keranjang
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
      </div>
    </button>
  );
}
