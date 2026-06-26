import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, MapPin, Phone, User, AlertCircle } from 'lucide-react';
import { getOrderById, updateOrderStatus } from '../services/orders';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('JNE');
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const data = await getOrderById(id);
      setOrder(data);
      if (data?.tracking_number) {
        setTrackingNumber(data.tracking_number);
      }
      if (data?.courier) {
        setCourier(data.courier);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus, requireTracking = false, cancelText = null) => {
    if (requireTracking && !trackingNumber.trim()) {
      alert("Harap masukkan nomor resi pengiriman terlebih dahulu.");
      return;
    }

    try {
      setIsUpdating(true);
      await updateOrderStatus(
        id, 
        newStatus, 
        requireTracking ? trackingNumber : undefined,
        requireTracking ? courier : undefined,
        cancelText
      );
      await fetchOrderDetails(); // Refresh data
      setIsCancelling(false);
    } catch (err) {
      alert("Gagal mengupdate status: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 dark:text-zinc-500">Memuat detail pesanan...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 flex flex-col items-center justify-center gap-3">
        <AlertCircle className="text-red-500" size={32} />
        <h3 className="text-red-500 font-medium text-lg">Pesanan tidak ditemukan</h3>
        <p className="text-red-400/80 text-sm">{error}</p>
        <button onClick={() => navigate('/orders')} className="mt-4 px-4 py-2 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg hover:bg-gray-300 dark:bg-zinc-700">Kembali ke Daftar</button>
      </div>
    );
  }

  // Helper for progress bar
  const statusIndex = ['processing', 'shipped', 'delivered'].indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/orders')} className="p-2 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:text-zinc-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Pesanan {order.tracking_code || `#${order.id.split('-')[0].toUpperCase()}`}</h1>
            {isCancelled && <span className="px-2.5 py-1 bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold rounded-md">DIBATALKAN</span>}
          </div>
          <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">
            Dibuat pada {new Date(order.created_at).toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Items & Progress */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Progress Tracker */}
          {!isCancelled && (
            <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-8">Status Pemrosesan</h3>
              
              <div className="flex items-center justify-center gap-0">
                {[
                  { id: 'processing', label: 'Dikemas', icon: Package },
                  { id: 'shipped', label: 'Dikirim', icon: Truck },
                  { id: 'delivered', label: 'Selesai', icon: CheckCircle }
                ].map((step, idx) => {
                  const Icon = step.icon;
                  const isCompleted = statusIndex >= idx;
                  const isCurrent = statusIndex === idx;
                  const isLineActive = statusIndex > idx;

                  return (
                    <React.Fragment key={step.id}>
                      {/* Step Circle */}
                      <div className="flex flex-col items-center gap-3">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          isCompleted
                            ? 'bg-yellow-500 border-yellow-500 text-black shadow-[0_0_18px_rgba(234,179,8,0.35)]'
                            : 'bg-white dark:bg-zinc-950 border-gray-300 dark:border-zinc-700 text-gray-400 dark:text-zinc-600'
                        }`}>
                          <Icon size={18} />
                        </div>
                        <span className={`text-xs font-semibold text-center whitespace-nowrap ${
                          isCurrent ? 'text-yellow-500' : isCompleted ? 'text-gray-700 dark:text-zinc-200' : 'text-gray-400 dark:text-zinc-600'
                        }`}>
                          {step.label}
                        </span>
                      </div>

                      {/* Connector line between steps (not after the last one) */}
                      {idx < 2 && (
                        <div className={`flex-1 h-0.5 mb-6 mx-3 rounded-full transition-all duration-500 ${isLineActive ? 'bg-yellow-500' : 'bg-gray-200 dark:bg-zinc-700'}`} />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Produk yang Dibeli</h3>
              <span className="text-xs bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 px-2.5 py-1 rounded-full">{order.order_items?.length || 0} Item</span>
            </div>
            
            <div className="divide-y divide-zinc-800/50 p-2">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-200/50 dark:bg-zinc-800/20 transition-colors rounded-lg">
                  <div className="w-16 h-16 bg-white dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-800 overflow-hidden shrink-0">
                    {item.products?.image_url ? (
                      <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-zinc-700 text-[10px] font-bold">NO IMG</div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-800 dark:text-zinc-200 font-medium truncate">{item.products?.name || 'Produk Dihapus'}</h4>
                    <div className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Rp {Number(item.unit_price).toLocaleString('id-ID')} x {item.quantity}</div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <div className="font-bold text-yellow-500">Rp {(item.unit_price * item.quantity).toLocaleString('id-ID')}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-white/50 dark:bg-zinc-950/50 p-5 border-t border-gray-200 dark:border-zinc-800 flex justify-between items-center">
              <span className="text-gray-500 dark:text-zinc-400 font-medium">Total Pesanan</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Rp {Number(order.total_amount).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Actions */}
        <div className="space-y-6">
          
          {/* Action Box */}
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-zinc-800 pb-3">Tindakan Admin</h3>
            
            <div className="space-y-4">
              {order.status === 'pending' && (
                <div className="space-y-4">
                  {!isCancelling ? (
                    <>
                      <button 
                        onClick={() => handleUpdateStatus('processing')}
                        disabled={isUpdating}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <Package size={18} /> Setujui Pesanan
                      </button>
                      <button 
                        onClick={() => setIsCancelling(true)}
                        disabled={isUpdating}
                        className="w-full bg-transparent border border-red-500/50 text-red-500 hover:bg-red-500/10 font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        Batalkan Pesanan
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3 bg-red-500/5 p-4 rounded-lg border border-red-500/20">
                      <label className="text-xs font-bold text-red-400">Alasan Pembatalan</label>
                      <textarea 
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Contoh: Stok barang kosong, pembeli minta batal, dll."
                        className="w-full bg-white dark:bg-zinc-950 border border-red-500/20 rounded-lg px-3 py-2 text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-red-500 text-sm min-h-[80px]"
                      ></textarea>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            if (!cancelReason.trim()) {
                              alert("Harap isi alasan pembatalan!");
                              return;
                            }
                            handleUpdateStatus('cancelled', false, cancelReason);
                          }}
                          disabled={isUpdating || !cancelReason.trim()}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50 text-sm"
                        >
                          Konfirmasi Batal
                        </button>
                        <button 
                          onClick={() => setIsCancelling(false)}
                          disabled={isUpdating}
                          className="flex-1 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:bg-zinc-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
                        >
                          Kembali
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Box: Processing is now the first step */}              {order.status === 'processing' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-zinc-400">Kurir Pengiriman</label>
                    <select 
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-yellow-500 text-sm"
                    >
                      <option value="JNE">JNE</option>
                      <option value="J&T Express">J&T Express</option>
                      <option value="SiCepat">SiCepat</option>
                      <option value="AnterAja">AnterAja</option>
                      <option value="Ninja Xpress">Ninja Xpress</option>
                      <option value="Pos Indonesia">Pos Indonesia</option>
                      <option value="Gojek/Grab">Gojek / Grab</option>
                      <option value="Kurir Toko">Kurir Internal Toko</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-zinc-400">Nomor Resi Pengiriman</label>
                    <input 
                      type="text" 
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Contoh: JP1234567890"
                      className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-yellow-500 text-sm uppercase font-mono"
                    />
                  </div>
                  <button 
                    onClick={() => handleUpdateStatus('shipped', true)}
                    disabled={isUpdating || !trackingNumber.trim()}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Truck size={18} /> Tandai Telah Dikirim
                  </button>
                </div>
              )}

              {order.status === 'shipped' && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 text-sm flex justify-between items-center">
                    <div>
                      <span className="text-gray-400 dark:text-zinc-500 block mb-1">Kurir & Resi:</span>
                      <span className="text-gray-800 dark:text-zinc-200 font-mono font-bold tracking-wider">{order.courier || 'Kurir'} - {order.tracking_number || '-'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUpdateStatus('delivered')}
                    disabled={isUpdating}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={18} /> Tandai Selesai
                  </button>
                </div>
              )}

              {order.status === 'delivered' && (
                <div className="text-center py-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="text-green-500 mx-auto mb-2" size={24} />
                  <p className="text-green-500 font-medium text-sm">Pesanan telah selesai</p>
                  <p className="text-green-600/70 text-xs mt-1">Resi: {order.tracking_number}</p>
                </div>
              )}

              {order.status === 'cancelled' && (
                <div className="text-center py-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="text-red-500 mx-auto mb-2" size={24} />
                  <p className="text-red-500 font-medium text-sm">Pesanan Dibatalkan</p>
                  <p className="text-red-400/70 text-xs mt-1 px-4 text-center">Alasan: {order.cancel_reason || 'Tidak ada alasan'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-zinc-800 pb-3">Informasi Pelanggan</h3>
            
            <div className="space-y-4">
              <div className="flex gap-3 text-sm">
                <User className="text-gray-400 dark:text-zinc-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-gray-800 dark:text-zinc-200 font-medium">{order.profiles?.full_name || 'Guest User'}</p>
                  <p className="text-gray-400 dark:text-zinc-500">{order.profiles?.email || 'No email'}</p>
                </div>
              </div>
              
              <div className="flex gap-3 text-sm">
                <Phone className="text-gray-400 dark:text-zinc-500 shrink-0 mt-0.5" size={16} />
                <p className="text-gray-800 dark:text-zinc-200 font-mono">{order.contact_phone || '-'}</p>
              </div>

              <div className="flex gap-3 text-sm">
                <MapPin className="text-gray-400 dark:text-zinc-500 shrink-0 mt-0.5" size={16} />
                <p className="text-gray-700 dark:text-zinc-300 leading-relaxed">
                  {order.shipping_address || 'Tidak ada alamat pengiriman'}
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
