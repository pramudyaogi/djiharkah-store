import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Store } from 'lucide-react';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { product, quantity } = location.state || {};
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');

  // Jika diakses tanpa state produk
  if (!product) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const totalPrice = product.price * quantity;

      // Gunakan RPC (Remote Procedure Call) agar aman dari blokir keamanan (RLS) Guest
      const { data: orderData, error: rpcError } = await supabase.rpc('create_guest_order', {
        p_name: formData.name,
        p_phone: formData.phone,
        p_email: formData.email,
        p_address: formData.address,
        p_product_id: product.id,
        p_quantity: quantity,
        p_unit_price: product.price
      });

      if (rpcError) throw rpcError;

      setTrackingCode(orderData.tracking_code);
      setSuccess(true);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal memproses pesanan guest.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Store size={40} />
        </div>
        <h1 className="text-3xl font-playfair font-bold text-hitam mb-4">Pesanan Berhasil Dibuat!</h1>
        <p className="text-gray-600 mb-6">Terima kasih telah berbelanja di Djiharkah Store. Tim kami akan segera menghubungi Anda melalui nomor telepon yang diberikan.</p>
        
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl max-w-sm mx-auto mb-8">
          <p className="text-sm text-gray-500 mb-2 uppercase tracking-wide font-bold">Kode Resi Anda</p>
          <div className="text-2xl font-mono font-bold text-emas tracking-wider select-all cursor-pointer" title="Klik untuk menyalin" onClick={() => navigator.clipboard.writeText(trackingCode)}>
            {trackingCode || 'MEMPROSES...'}
          </div>
          <p className="text-xs text-gray-400 mt-2">Simpan kode ini untuk melacak status pesanan Anda.</p>
        </div>

        <div className="flex justify-center gap-4">
          <button 
            onClick={() => navigate('/track-order?code=' + trackingCode)}
            className="bg-emas text-hitam px-6 py-3 font-bold hover:bg-hitam hover:text-emas transition-colors rounded-lg shadow-sm"
          >
            Lacak Pesanan
          </button>
          <button 
            onClick={() => navigate('/')}
            className="bg-gray-100 text-gray-700 px-6 py-3 font-bold hover:bg-gray-200 transition-colors rounded-lg shadow-sm"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-playfair font-bold text-hitam mb-10 border-b border-emas/30 pb-4">Guest Checkout</h1>
      
      {error && <div className="bg-red-50 text-red-700 p-4 mb-8 border border-red-200">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 p-8">
          <h3 className="text-xl font-playfair font-bold text-hitam mb-6">Informasi Pembeli</h3>
          <form id="guest-checkout-form" onSubmit={handleCheckout} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Nama Lengkap *</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emas" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">No Telepon *</label>
              <input type="text" name="phone" required value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emas" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email (Opsional)</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emas" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Alamat Lengkap *</label>
              <textarea name="address" required rows={3} value={formData.address} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-emas resize-none" />
            </div>
          </form>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-8 h-fit">
          <h3 className="text-xl font-playfair font-bold text-hitam mb-6">Ringkasan Pesanan</h3>
          <div className="flex gap-4 mb-6 border-b border-gray-200 pb-6">
            <div className="w-16 h-16 bg-gray-200 shrink-0">
              {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />}
            </div>
            <div>
              <h4 className="font-bold text-hitam">{product.name}</h4>
              <p className="text-sm text-gray-500">{quantity} x Rp {product.price.toLocaleString('id-ID')}</p>
            </div>
          </div>
          <div className="flex justify-between items-center mb-8">
            <span className="font-bold text-hitam">Total</span>
            <span className="text-2xl font-bold text-emas">Rp {(product.price * quantity).toLocaleString('id-ID')}</span>
          </div>
          <button
            form="guest-checkout-form"
            type="submit"
            disabled={loading}
            className="w-full bg-emas text-hitam py-4 font-bold text-lg hover:bg-hitam hover:text-emas border border-transparent hover:border-emas transition-colors disabled:opacity-50 uppercase tracking-wider"
          >
            {loading ? 'Memproses...' : 'Lanjut Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
