import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Package, Truck, CheckCircle, Clock, Search, AlertCircle, ChevronLeft } from 'lucide-react';

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = searchParams.get('code') || '';
  
  const [trackingCode, setTrackingCode] = useState(initialCode);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [storePhone, setStorePhone] = useState('');

  const cleanPhoneForWhatsApp = (phoneStr) => {
    if (!phoneStr) return '';
    let cleaned = phoneStr.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    return cleaned;
  };

  const getRecipientName = () => {
    if (!order) return '';
    if (order.customer_name && order.customer_name !== 'Guest') {
      return order.customer_name;
    }
    // If it's Guest, try to extract name from shipping_address
    if (order.shipping_address) {
      const parts = order.shipping_address.split(' - ');
      if (parts.length > 0 && parts[0].trim()) {
        return parts[0].trim();
      }
    }
    return 'Guest';
  };

  const handleWhatsAppOrderInquiry = () => {
    const cleanedPhone = cleanPhoneForWhatsApp(storePhone || '6281234567890');
    const message = `Assalamualaikum Djiharkah Store.\nSaya ingin menanyakan pesanan saya:\n- Kode Pesanan: ${order.tracking_code}\n- Status: ${getStatusDisplay(order.status).label}\n- Penerima: ${getRecipientName()}\n- Total Pembayaran: Rp ${order.total_amount.toLocaleString('id-ID')}`;
    window.open(`https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleConfirmReceived = async () => {
    if (!window.confirm('Apakah Anda yakin pesanan sudah sampai dan diterima dengan baik?')) return;
    setConfirming(true);
    try {
      const { error } = await supabase.rpc('confirm_order_delivery', {
        p_tracking_code: order.tracking_code
      });
      if (error) throw error;
      alert('Terima kasih! Pesanan Anda telah dinyatakan selesai.');
      // Refresh order details
      await handleSearch(null, order.tracking_code);
    } catch (err) {
      console.error(err);
      alert('Gagal mengonfirmasi penerimaan: ' + err.message);
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      handleSearch(null, initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    async function fetchStorePhone() {
      try {
        const { data, error } = await supabase.from('store_settings').select('phone').eq('id', 1).single();
        if (data && !error) {
          setStorePhone(data.phone || '');
        }
      } catch (err) {
        console.error('Failed to fetch store settings:', err);
      }
    }
    fetchStorePhone();
  }, []);

  const handleSearch = async (e, code = trackingCode) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;
    
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const { data, error } = await supabase.rpc('track_order', {
        p_tracking_code: code.trim()
      });

      if (error) throw error;
      if (!data) {
        throw new Error("Pesanan dengan kode resi tersebut tidak ditemukan.");
      }

      setOrder(data);
    } catch (err) {
      setError(err.message || 'Gagal melacak pesanan.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch(status) {
      case 'pending':
        return { label: 'Menunggu Konfirmasi', icon: <Clock size={40} />, color: 'text-yellow-500', bg: 'bg-yellow-50' };
      case 'processing':
        return { label: 'Sedang Diproses', icon: <Package size={40} />, color: 'text-blue-500', bg: 'bg-blue-50' };
      case 'shipped':
        return { label: 'Dalam Pengiriman', icon: <Truck size={40} />, color: 'text-purple-500', bg: 'bg-purple-50' };
      case 'delivered':
        return { label: 'Selesai', icon: <CheckCircle size={40} />, color: 'text-green-500', bg: 'bg-green-50' };
      case 'cancelled':
        return { label: 'Dibatalkan', icon: <AlertCircle size={40} />, color: 'text-red-500', bg: 'bg-red-50' };
      default:
        return { label: status, icon: <Package size={40} />, color: 'text-gray-500', bg: 'bg-gray-50' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 min-h-[70vh]">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-emas transition-colors mb-8 group">
        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Kembali
      </button>

      <h1 className="text-3xl font-playfair font-bold text-hitam mb-2 text-center">Lacak Pesanan Anda</h1>
      <p className="text-center text-gray-500 mb-10">Masukkan kode pesanan yang Anda dapatkan saat checkout.</p>
      
      {/* Search Bar */}
      <div className="max-w-xl mx-auto mb-12">
        <form onSubmit={handleSearch} className="flex relative items-center">
          <input 
            type="text" 
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
            placeholder="Contoh: ORD-240626" 
            className="w-full px-4 sm:px-6 py-3 sm:py-4 pr-24 sm:pr-32 text-sm sm:text-lg font-mono tracking-wider sm:tracking-widest bg-white border-2 border-gray-200 rounded-full focus:outline-none focus:border-emas transition-colors uppercase shadow-sm"
          />
          <button 
            type="submit"
            disabled={loading || !trackingCode}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-4 sm:px-6 bg-emas text-hitam font-bold text-xs sm:text-sm rounded-full hover:bg-hitam hover:text-emas transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? '...' : <><Search size={14} className="sm:w-[18px] sm:h-[18px]" /> CARI</>}
          </button>
        </form>
        {error && (
          <div className="mt-4 text-center text-red-500 bg-red-50 py-2 rounded-lg text-sm flex items-center justify-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </div>

      {/* Result Section */}
      {order && (
        <div className="bg-white border border-gray-100 rounded-3xl shadow-soft overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Header */}
          <div className="bg-gray-50 p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1 font-medium">KODE PESANAN</p>
              <h2 className="text-2xl font-mono font-bold text-hitam tracking-wider">{order.tracking_code}</h2>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-gray-500 mb-1 font-medium">TANGGAL PEMESANAN</p>
              <p className="text-hitam font-medium">
                {new Date(order.created_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              
              {/* Left Column: Status & Info */}
              <div>
                <h3 className="font-playfair font-bold text-lg text-hitam mb-6">Status Pesanan</h3>
                
                <div className={`p-6 rounded-2xl border border-gray-100 flex items-center gap-6 mb-8 ${getStatusDisplay(order.status).bg}`}>
                  <div className={getStatusDisplay(order.status).color}>
                    {getStatusDisplay(order.status).icon}
                  </div>
                  <div>
                    <h4 className={`text-xl font-bold ${getStatusDisplay(order.status).color}`}>
                      {getStatusDisplay(order.status).label}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.status === 'pending' && 'Pesanan sedang menunggu konfirmasi admin.'}
                      {order.status === 'processing' && 'Tim kami sedang memproses pesanan Anda.'}
                      {order.status === 'shipped' && 'Pesanan Anda sedang dalam perjalanan ke alamat tujuan.'}
                      {order.status === 'delivered' && 'Pesanan telah diterima. Terima kasih!'}
                      {order.status === 'cancelled' && 'Pesanan dibatalkan oleh admin.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleWhatsAppOrderInquiry}
                  className="w-full mb-8 bg-white hover:bg-zinc-50 text-hitam font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:-translate-y-0.5 active:scale-95 border-2 border-hitam"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
                  </svg>
                  Tanyakan Pesanan via WhatsApp
                </button>

                {order.status === 'shipped' && (
                  <div className="bg-emas/10 border border-emas/20 p-5 rounded-2xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-slide-up">
                    <div className="text-center sm:text-left">
                      <h4 className="text-sm font-bold text-hitam mb-1">Sudah Menerima Produk?</h4>
                      <p className="text-xs text-gray-500">Konfirmasi penerimaan barang untuk menyelesaikan pesanan Anda.</p>
                    </div>
                    <button
                      onClick={handleConfirmReceived}
                      disabled={confirming}
                      className="w-full sm:w-auto bg-emas hover:bg-yellow-400 text-hitam font-bold text-xs px-5 py-3 rounded-full flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0"
                    >
                      {confirming ? (
                        <div className="w-4 h-4 border-2 border-hitam border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      Pesanan Diterima
                    </button>
                  </div>
                )}

                {order.status === 'cancelled' && (
                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100 mb-8">
                    <h4 className="text-red-700 font-bold mb-2 flex items-center gap-2">
                      <AlertCircle size={18} /> Alasan Pembatalan:
                    </h4>
                    <p className="text-red-600/90 text-sm mb-4">
                      {order.cancel_reason || 'Tidak ada alasan yang diberikan.'}
                    </p>
                    <div className="bg-white p-4 rounded-xl border border-red-100">
                      <p className="text-sm text-gray-700 font-medium">Instruksi Pengembalian Dana (Refund)</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Silakan hubungi admin kami via WhatsApp dan berikan rincian Bank/Rekening Anda untuk proses pengembalian dana secepatnya.
                      </p>
                    </div>
                  </div>
                )}

                {order.tracking_number && (
                  <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 mb-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    {/* Decorative Background Icon */}
                    <Truck className="absolute -right-4 -bottom-4 text-purple-100 opacity-50" size={100} />
                    
                    <div className="relative z-10 w-full">
                      <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-1">
                        Dikirim via {order.courier || 'Kurir Ekspedisi'}
                      </p>
                      
                      <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-purple-100 my-4 inline-flex items-center gap-4">
                        <div className="text-left">
                          <span className="text-xs text-gray-500 block mb-1">Nomor Resi:</span>
                          <span className="text-2xl font-mono font-bold text-hitam tracking-wider select-all">{order.tracking_number}</span>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(order.tracking_number);
                            alert('Resi berhasil disalin!');
                          }}
                          className="bg-purple-100 text-purple-600 p-2 rounded-lg hover:bg-purple-200 transition-colors"
                          title="Salin Resi"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                      </div>

                      <a 
                        href={`https://cekresi.com/?noresi=${order.tracking_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-purple-700 transition-colors shadow-sm"
                      >
                        Lacak Paket di CekResi <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      </a>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Penerima</h4>
                    <p className="text-hitam font-medium">{getRecipientName()}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Alamat Pengiriman</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{order.shipping_address}</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Items */}
              <div>
                <h3 className="font-playfair font-bold text-lg text-hitam mb-6">Rincian Produk</h3>
                
                <div className="space-y-4 mb-6">
                  {order.items && order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">NO IMG</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-hitam text-sm mb-1">{item.product_name}</h4>
                        <div className="flex justify-between items-end">
                          <p className="text-sm text-gray-500">{item.quantity} x Rp {item.unit_price.toLocaleString('id-ID')}</p>
                          <p className="font-bold text-hitam">Rp {(item.quantity * item.unit_price).toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                 <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                   <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                     <span>Subtotal</span>
                     <span>Rp {(order.total_amount - (order.shipping_cost || 0)).toLocaleString('id-ID')}</span>
                   </div>
                   <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                     <span>Ongkos Kirim</span>
                     <span className={Number(order.shipping_cost) > 0 ? 'text-gray-700 font-semibold' : 'text-green-600 font-semibold'}>
                       {Number(order.shipping_cost) > 0 ? `Rp ${Number(order.shipping_cost).toLocaleString('id-ID')}` : 'Gratis'}
                     </span>
                   </div>
                   <div className="w-full h-px bg-gray-200 mb-4"></div>
                   <div className="flex justify-between items-center">
                     <span className="font-bold text-hitam">Total Pembayaran</span>
                     <span className="text-2xl font-bold text-emas">Rp {order.total_amount.toLocaleString('id-ID')}</span>
                   </div>
                 </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
