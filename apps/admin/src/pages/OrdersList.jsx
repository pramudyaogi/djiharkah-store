import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye, Clock, Package, Truck, CheckCircle, XCircle } from 'lucide-react';
import { getOrders } from '../services/orders';

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await getOrders();
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'Semua Pesanan' },
    { id: 'pending', label: 'Menunggu Konfirmasi' },
    { id: 'processing', label: 'Perlu Dikemas' },
    { id: 'shipped', label: 'Dikirim' },
    { id: 'delivered', label: 'Selesai' },
    { id: 'cancelled', label: 'Dibatalkan' },
  ];

  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => order.status === activeTab);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-xs font-medium border border-yellow-500/20 flex items-center gap-1.5 w-max"><Clock size={12}/> Pending</span>;
      case 'processing':
        return <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium border border-blue-500/20 flex items-center gap-1.5 w-max"><Package size={12}/> Diproses</span>;
      case 'shipped':
        return <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-xs font-medium border border-purple-500/20 flex items-center gap-1.5 w-max"><Truck size={12}/> Dikirim</span>;
      case 'delivered':
        return <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium border border-green-500/20 flex items-center gap-1.5 w-max"><CheckCircle size={12}/> Selesai</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium border border-red-500/20 flex items-center gap-1.5 w-max"><XCircle size={12}/> Batal</span>;
      default:
        return <span className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full text-xs font-medium w-max">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Manajemen Pesanan</h1>
        <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">Kelola dan proses pesanan yang masuk dari pelanggan.</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 border-b border-gray-200 dark:border-zinc-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-2.5 ${
              activeTab === tab.id 
              ? 'border-yellow-600 text-yellow-600 dark:border-yellow-500 dark:text-yellow-500' 
              : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
            }`}
          >
            {tab.label}
            {tab.id !== 'all' && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-yellow-100 dark:bg-yellow-500/20' : 'bg-gray-100 dark:bg-zinc-800'}`}>
                {orders.filter(o => o.status === tab.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-zinc-400">
            <thead className="bg-gray-50 dark:bg-zinc-950/50 text-xs uppercase text-gray-500 dark:text-zinc-500 font-medium">
              <tr>
                <th className="px-6 py-4">ID Pesanan</th>
                <th className="px-6 py-4">Pelanggan</th>
                <th className="px-6 py-4">Total Harga</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                      Memuat data pesanan...
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-500 dark:text-zinc-500">
                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Tidak ada pesanan di kategori ini.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-gray-800 dark:text-zinc-300 text-xs font-bold">
                        {order.tracking_code || 'PROSES...'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-zinc-200">{order.shipping_address ? order.shipping_address.split(' - ')[0] : 'Guest User'}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-500">{order.shipping_address ? order.shipping_address.split(' - ')[1] : '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-yellow-600 dark:text-yellow-500">
                        Rp {Number(order.total_amount).toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700 dark:text-zinc-300">
                        {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-500">
                        {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/orders/${order.id}`}
                        className="inline-flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium"
                      >
                        <Eye size={14} /> Detail
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
