import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Store, ChevronLeft } from 'lucide-react';

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
  const [validationErrors, setValidationErrors] = useState({});
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
    
    // Custom Validation
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Nama lengkap wajib diisi.';
    if (!formData.phone.trim()) errors.phone = 'Nomor telepon wajib diisi.';
    if (!formData.address.trim()) errors.address = 'Alamat lengkap wajib diisi.';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
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
    <div className="min-h-screen bg-gray-50/60 py-10 px-4">
      <div className="max-w-4xl mx-auto">

      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-emas transition-colors mb-8 group">
        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Kembali
      </button>

      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-playfair font-bold text-hitam mb-1">Checkout</h1>
        <p className="text-sm text-gray-400">Lengkapi informasi di bawah untuk menyelesaikan pesanan Anda.</p>
      </div>

      {error && <p className="text-red-500 text-sm mb-6 font-medium">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">

        {/* LEFT: Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-7">Informasi Pembeli</h3>
          <form id="guest-checkout-form" onSubmit={handleCheckout} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Lengkap *</label>
              <input
                type="text" name="name" value={formData.name} onChange={handleChange}
                placeholder="Nama Anda"
                className={`w-full px-4 py-3 bg-gray-50/80 border rounded-xl text-hitam text-sm focus:outline-none focus:bg-white transition-all placeholder:text-gray-300 ${
                  validationErrors.name ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emas focus:ring-1 focus:ring-emas/20'
                }`}
              />
              {validationErrors.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">No Telepon *</label>
              <input
                type="text" name="phone" value={formData.phone} onChange={handleChange}
                placeholder="08xxxxxxxxxx"
                className={`w-full px-4 py-3 bg-gray-50/80 border rounded-xl text-hitam text-sm focus:outline-none focus:bg-white transition-all placeholder:text-gray-300 ${
                  validationErrors.phone ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emas focus:ring-1 focus:ring-emas/20'
                }`}
              />
              {validationErrors.phone && <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email <span className="normal-case tracking-normal font-normal text-gray-400">(Opsional)</span></label>
              <input
                type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="email@contoh.com"
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-hitam text-sm focus:outline-none focus:bg-white focus:border-emas focus:ring-1 focus:ring-emas/20 transition-all placeholder:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Alamat Lengkap *</label>
              <textarea
                name="address" rows={3} value={formData.address} onChange={handleChange}
                placeholder="Jl. Contoh No. 1, Kelurahan, Kecamatan, Kota..."
                className={`w-full px-4 py-3 bg-gray-50/80 border rounded-xl text-hitam text-sm focus:outline-none focus:bg-white resize-none transition-all placeholder:text-gray-300 ${
                  validationErrors.address ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-emas focus:ring-1 focus:ring-emas/20'
                }`}
              />
              {validationErrors.address && <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.address}</p>}
            </div>
          </form>
        </div>

        {/* RIGHT: Order Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 h-fit">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-7">Ringkasan Pesanan</h3>

          {/* Product Item */}
          <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-gray-50">
              {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex flex-col justify-center gap-1">
              <p className="font-semibold text-hitam text-sm leading-snug">{product.name}</p>
              <p className="text-xs text-gray-400">{quantity} × Rp {product.price.toLocaleString('id-ID')}</p>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-3 mb-6 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>Rp {(product.price * quantity).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Ongkos Kirim</span>
              <span className="text-green-600 font-semibold">Gratis</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-5 border-t border-gray-100 mb-7">
            <span className="font-bold text-hitam text-sm">Total</span>
            <span className="text-2xl font-bold text-hitam">Rp {(product.price * quantity).toLocaleString('id-ID')}</span>
          </div>

          {/* CTA Button */}
          <button
            form="guest-checkout-form"
            type="submit"
            disabled={loading}
            className="w-full bg-emas text-hitam py-4 rounded-xl font-bold text-sm hover:bg-yellow-400 hover:shadow-[0_8px_20px_rgba(212,168,73,0.3)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? 'Memproses...' : 'Lanjut Checkout →'}
          </button>
          <p className="text-center text-xs text-gray-400 mt-4">Tim kami akan menghubungi Anda setelah pesanan diterima.</p>
        </div>

      </div>
      </div>
    </div>
  );
}
