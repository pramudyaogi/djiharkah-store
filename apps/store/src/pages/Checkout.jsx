import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/useCartStore';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Checkout() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const handleCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create Order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: getTotalPrice(),
          shipping_address: address,
          status: 'pending'
        })
        .select()
        .single();
      
      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Clear Cart & Redirect
      clearCart();
      alert('Pesanan berhasil dibuat!');
      navigate('/profile');
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal memproses pesanan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-4xl font-playfair font-bold text-hitam mb-10 border-b border-emas/30 pb-4">Checkout</h1>
      
      {error && <div className="bg-red-50 text-red-700 p-4 mb-8 border border-red-200">{error}</div>}

      <div className="bg-white border border-gray-200 p-8 mb-8">
        <h3 className="text-xl font-playfair font-bold text-hitam mb-6">Alamat Pengiriman</h3>
        <form id="checkout-form" onSubmit={handleCheckout}>
          <textarea
            required
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-emas focus:ring-1 focus:ring-emas transition-all resize-none"
            placeholder="Masukkan alamat lengkap pengiriman (Jalan, RT/RW, Kec, Kota, Kode Pos)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </form>
      </div>

      <div className="bg-gray-50 border border-gray-200 p-8">
        <h3 className="text-xl font-playfair font-bold text-hitam mb-6">Ringkasan Total</h3>
        <div className="flex justify-between items-center mb-8 pb-8 border-b border-gray-200">
          <span className="text-abu-abu">Total Belanja ({items.length} item)</span>
          <span className="text-2xl font-bold text-emas">Rp {getTotalPrice().toLocaleString('id-ID')}</span>
        </div>
        
        <button
          form="checkout-form"
          type="submit"
          disabled={loading || !address}
          className="w-full bg-emas text-hitam py-4 font-bold text-lg hover:bg-hitam hover:text-emas border border-transparent hover:border-emas transition-colors disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'BUAT PESANAN'}
        </button>
      </div>
    </div>
  );
}
