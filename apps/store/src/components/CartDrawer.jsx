import React from 'react';
import { X, ShoppingBag, Trash2, ShieldCheck, Clock } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useTranslation } from '../utils/translations';
import useCurrencyStore from '../store/useCurrencyStore';
import { formatPrice } from '../utils/currencyHelper';
import { useNavigate } from 'react-router-dom';

export default function CartDrawer() {
  const { cartItems, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, cartTotalItems } = useCart();
  const { currency, rates } = useCurrencyStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const totalSubtotal = cartItems.reduce((total, item) => {
    const promoSubtotal = item.promoQty * item.promoPrice;
    const normalSubtotal = item.normalQty * item.normalPrice;
    return total + promoSubtotal + normalSubtotal;
  }, 0);

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout'); // We will modify checkout to read from CartContext
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-[100] shadow-2xl flex flex-col transform transition-transform duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-emas" size={24} />
            <div>
              <h2 className="font-playfair font-bold text-xl text-hitam">Keranjang</h2>
              <p className="text-xs text-gray-500">{cartTotalItems} barang • Berlaku 30 menit</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-hitam transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 space-y-4">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingBag size={48} className="opacity-20" />
              <p>Keranjang Anda masih kosong.</p>
            </div>
          ) : (
            cartItems.map(item => {
              const product = item.product;
              const imgUrl = product.images?.[0] || product.image_url;
              return (
                <div key={product.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-50">
                    {imgUrl ? (
                      <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">NO IMG</div>
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <h3 className="font-medium text-sm text-hitam line-clamp-2 leading-tight">{product.name}</h3>
                        <button 
                          onClick={() => removeFromCart(product.id)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors -mt-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="text-emas font-bold text-sm mb-2">
                        {formatPrice((item.promoQty * item.promoPrice) + (item.normalQty * item.normalPrice), currency, rates)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      {product.promo_type && item.promoQty > 0 ? (
                         <span className="text-[10px] font-bold bg-red-50 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                           ⚡ Promo
                         </span>
                      ) : (
                         <div/>
                      )}

                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-8">
                        <button 
                          onClick={() => updateQuantity(product.id, item.quantity - 1)}
                          className="w-8 h-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                        >-</button>
                        <span className="w-8 text-center text-xs font-semibold text-hitam">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateQuantity(product.id, item.quantity + 1)}
                          disabled={item.quantity >= (product.promo_type ? product.original_stock : product.stock)}
                          className="w-8 h-full flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >+</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Checkout */}
        {cartItems.length > 0 && (
          <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500 font-medium text-sm">Subtotal</span>
              <span className="text-xl font-bold text-hitam-gelap">{formatPrice(totalSubtotal, currency, rates)}</span>
            </div>
            
            <button
              onClick={handleCheckout}
              className="w-full bg-gradient-to-r from-emas to-yellow-400 text-hitam py-4 rounded-xl font-bold text-sm hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(212,168,73,0.3)] transition-all duration-300 flex items-center justify-center gap-2"
            >
              Lanjutkan ke Checkout <ChevronRight size={18} />
            </button>
            <p className="text-center text-[10px] text-gray-400 mt-3 flex justify-center items-center gap-1">
               <ShieldCheck size={12}/> Transaksi aman & terenkripsi
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// Need ChevronRight
import { ChevronRight } from 'lucide-react';
