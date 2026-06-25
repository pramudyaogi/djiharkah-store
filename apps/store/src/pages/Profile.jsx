import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Package } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              quantity,
              unit_price,
              products (name, image_url)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [user.id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paid': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
      <div className="mb-10 border-b border-emas/30 pb-4 flex items-center justify-between">
        <h1 className="text-4xl font-playfair font-bold text-hitam">Profil & Riwayat Pesanan</h1>
        <div className="text-abu-abu">Halo, <span className="font-bold text-emas">{user.email}</span></div>
      </div>

      {/* Tabs Placeholder */}
      <div className="flex gap-8 mb-8 border-b border-gray-200">
        <button className="pb-4 border-b-2 border-emas text-emas font-bold">Riwayat Pesanan</button>
        <button className="pb-4 border-b-2 border-transparent text-gray-400 hover:text-hitam transition-colors">Pengaturan Akun</button>
      </div>

      {loading ? (
        <div className="text-emas font-playfair text-xl py-12 text-center">Memuat riwayat pesanan...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 border border-gray-200">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-playfair font-bold text-hitam mb-2">Belum Ada Pesanan</h3>
          <p className="text-abu-abu">Anda belum pernah melakukan pemesanan.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map(order => (
            <div key={order.id} className="bg-white border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-sm text-abu-abu mb-1">
                    Pesanan dibuat: {new Date(order.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="font-bold text-hitam">Order ID: <span className="font-mono font-normal text-sm">{order.id}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-abu-abu mb-1">Total</div>
                  <div className="font-bold text-emas text-xl">Rp {order.total_amount.toLocaleString('id-ID')}</div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <span className="text-sm font-bold text-hitam">Status:</span>
                  <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {order.order_items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <div className="w-16 h-16 bg-gray-100 border border-gray-200 shrink-0">
                        {item.products?.image_url && <img src={item.products.image_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-hitam">{item.products?.name || 'Produk Dihapus'}</div>
                        <div className="text-sm text-abu-abu">{item.quantity} x Rp {item.unit_price.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="font-bold text-hitam">
                        Rp {(item.quantity * item.unit_price).toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
