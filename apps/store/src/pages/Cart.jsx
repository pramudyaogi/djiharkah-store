import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCartStore from '../store/useCartStore';
import { Trash2 } from 'lucide-react';

export default function Cart() {
  const { items, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <h2 className="text-3xl font-playfair font-bold text-hitam mb-4">Keranjang Belanja Kosong</h2>
        <p className="text-abu-abu mb-8">Anda belum menambahkan produk apa pun ke keranjang.</p>
        <Link to="/products" className="bg-emas text-hitam px-8 py-3 font-bold hover:bg-hitam hover:text-emas transition-colors">
          Mulai Belanja
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8">
      <h1 className="text-4xl font-playfair font-bold text-hitam mb-10 border-b border-emas/30 pb-4">Keranjang Belanja</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {items.map(item => (
            <div key={item.id} className="flex gap-6 border border-gray-200 p-4 bg-white">
              <div className="w-24 h-24 bg-gray-100 shrink-0">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-playfair">No Img</div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <Link to={`/products/${item.slug}`}>
                    <h3 className="font-playfair font-bold text-lg text-hitam hover:text-emas">{item.name}</h3>
                  </Link>
                  <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
                <div className="flex justify-between items-end mt-4">
                  <div className="flex items-center border border-gray-300">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 text-hitam hover:bg-gray-100">-</button>
                    <span className="px-4 py-1 border-l border-r border-gray-300 text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 text-hitam hover:bg-gray-100">+</button>
                  </div>
                  <div className="font-bold text-emas text-lg">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 border border-gray-200 p-8 h-fit">
          <h3 className="text-xl font-playfair font-bold text-hitam mb-6">Ringkasan Pesanan</h3>
          <div className="space-y-4 text-sm mb-6 pb-6 border-b border-gray-200">
            <div className="flex justify-between">
              <span className="text-abu-abu">Subtotal</span>
              <span className="font-medium">Rp {getTotalPrice().toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-abu-abu">Pengiriman</span>
              <span className="font-medium text-emas">Dihitung saat checkout</span>
            </div>
          </div>
          <div className="flex justify-between items-end mb-8">
            <span className="font-bold text-hitam">Total</span>
            <span className="text-2xl font-bold text-emas">Rp {getTotalPrice().toLocaleString('id-ID')}</span>
          </div>
          <button 
            onClick={() => navigate('/checkout')}
            className="w-full bg-emas text-hitam py-4 font-bold text-lg hover:bg-hitam hover:text-emas border border-transparent hover:border-emas transition-colors"
          >
            CHECKOUT
          </button>
        </div>
      </div>
    </div>
  );
}
