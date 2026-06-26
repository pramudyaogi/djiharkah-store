import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingBag, TrendingUp, Package } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    revenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    itemsSold: 0,
  });
  
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all orders and order items
        const [ordersRes, orderItemsRes] = await Promise.all([
          supabase.from('orders').select('id, total_amount, status, created_at, shipping_address'),
          supabase.from('order_items').select('quantity, order_id, orders!inner(status)')
        ]);

        const orders = ordersRes.data || [];
        const orderItems = orderItemsRes.data || [];

        // 1. Calculate Metrics
        let revenue = 0;
        let successfulOrders = 0;
        let itemsSold = 0;
        let counts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };

        orders.forEach(order => {
          counts[order.status] = (counts[order.status] || 0) + 1;
          
          if (order.status !== 'cancelled') {
            revenue += (order.total_amount || 0);
            successfulOrders += 1;
          }
        });

        orderItems.forEach(item => {
          if (item.orders?.status !== 'cancelled') {
            itemsSold += (item.quantity || 0);
          }
        });

        const avgOrderValue = successfulOrders > 0 ? revenue / successfulOrders : 0;

        setStats({
          revenue,
          totalOrders: orders.length,
          avgOrderValue,
          itemsSold
        });
        
        setStatusCounts(counts);

        // Fetch recent 5 orders for the table
        const { data: recent } = await supabase
          .from('orders')
          .select('*') // No profiles here since guest checkout
          .order('created_at', { ascending: false })
          .limit(5);
          
        setRecentOrders(recent || []);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Format currency
  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h3 className="text-2xl font-playfair font-bold leading-6 text-gray-900 dark:text-white tracking-wide">Ringkasan Penjualan</h3>
        <p className="mt-3 text-sm text-gray-500 dark:text-zinc-400">
          Pantau performa penjualan dan status pesanan toko Anda secara keseluruhan.
        </p>
      </div>
      
      {/* Sales Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-md overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800/60 p-6 flex flex-col justify-center transition-all duration-300 hover:border-emas/30 hover:shadow-glow relative group">
          <div className="absolute top-0 inset-x-4 h-px bg-gradient-to-r from-transparent via-emas/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
              <DollarSign size={24} />
            </div>
            <dt className="text-sm font-semibold text-gray-500 dark:text-zinc-400 tracking-wider">Total Pendapatan</dt>
          </div>
          <dd className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-500 dark:from-white dark:to-zinc-300 group-hover:to-emas transition-colors duration-300">
            {formatRupiah(stats.revenue)}
          </dd>
        </div>

        {/* Total Orders */}
        <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-md overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800/60 p-6 flex flex-col justify-center transition-all duration-300 hover:border-emas/30 hover:shadow-glow relative group">
          <div className="absolute top-0 inset-x-4 h-px bg-gradient-to-r from-transparent via-emas/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <ShoppingBag size={24} />
            </div>
            <dt className="text-sm font-semibold text-gray-500 dark:text-zinc-400 tracking-wider">Total Pesanan</dt>
          </div>
          <dd className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-500 dark:from-white dark:to-zinc-300 group-hover:to-emas transition-colors duration-300">
            {stats.totalOrders}
          </dd>
        </div>

        {/* Avg Order Value */}
        <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-md overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800/60 p-6 flex flex-col justify-center transition-all duration-300 hover:border-emas/30 hover:shadow-glow relative group">
          <div className="absolute top-0 inset-x-4 h-px bg-gradient-to-r from-transparent via-emas/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
              <TrendingUp size={24} />
            </div>
            <dt className="text-sm font-semibold text-gray-500 dark:text-zinc-400 tracking-wider">Rata-rata Pesanan</dt>
          </div>
          <dd className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-500 dark:from-white dark:to-zinc-300 group-hover:to-emas transition-colors duration-300 truncate">
            {formatRupiah(stats.avgOrderValue)}
          </dd>
        </div>

        {/* Items Sold */}
        <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-md overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800/60 p-6 flex flex-col justify-center transition-all duration-300 hover:border-emas/30 hover:shadow-glow relative group">
          <div className="absolute top-0 inset-x-4 h-px bg-gradient-to-r from-transparent via-emas/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emas/10 rounded-xl text-emas">
              <Package size={24} />
            </div>
            <dt className="text-sm font-semibold text-gray-500 dark:text-zinc-400 tracking-wider">Barang Terjual</dt>
          </div>
          <dd className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-500 dark:from-white dark:to-zinc-300 group-hover:to-emas transition-colors duration-300">
            {stats.itemsSold}
          </dd>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-sm rounded-3xl border border-gray-200 dark:border-zinc-800/60 overflow-hidden shadow-soft mt-8 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-wide mb-6">Status Pesanan</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 dark:bg-zinc-950/50 p-4 rounded-xl border border-yellow-500/20 flex flex-col items-center">
            <span className="text-yellow-500 text-3xl font-bold mb-1">{statusCounts.pending}</span>
            <span className="text-xs text-gray-500 dark:text-zinc-400 uppercase">Pending</span>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-950/50 p-4 rounded-xl border border-blue-500/20 flex flex-col items-center">
            <span className="text-blue-500 text-3xl font-bold mb-1">{statusCounts.processing}</span>
            <span className="text-xs text-gray-500 dark:text-zinc-400 uppercase">Diproses</span>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-950/50 p-4 rounded-xl border border-indigo-500/20 flex flex-col items-center">
            <span className="text-indigo-500 dark:text-indigo-400 text-3xl font-bold mb-1">{statusCounts.shipped}</span>
            <span className="text-xs text-gray-500 dark:text-zinc-400 uppercase">Dikirim</span>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-950/50 p-4 rounded-xl border border-green-500/20 flex flex-col items-center">
            <span className="text-green-500 text-3xl font-bold mb-1">{statusCounts.delivered}</span>
            <span className="text-xs text-gray-500 dark:text-zinc-400 uppercase">Selesai</span>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-950/50 p-4 rounded-xl border border-red-500/20 flex flex-col items-center">
            <span className="text-red-500 text-3xl font-bold mb-1">{statusCounts.cancelled}</span>
            <span className="text-xs text-gray-500 dark:text-zinc-400 uppercase">Dibatalkan</span>
          </div>
        </div>
      </div>
      
      {/* Recent Orders Section */}
      <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-sm rounded-3xl border border-gray-200 dark:border-zinc-800/60 overflow-hidden shadow-soft mt-8 animate-fade-in">
        <div className="p-6 border-b border-gray-200 dark:border-zinc-800/60 flex justify-between items-center bg-gray-50 dark:bg-zinc-900/50">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-wide">Pesanan Terbaru</h2>
          <Link to="/orders" className="text-xs text-emas hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors">Lihat Semua Pesanan &rarr;</Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
            <thead className="bg-gray-100 dark:bg-zinc-900/20">
              <tr>
                <th scope="col" className="py-4 pl-6 pr-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">ID Pesanan</th>
                <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Pelanggan</th>
                <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Tanggal</th>
                <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Total</th>
                <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-sm text-gray-500 dark:text-zinc-500">Memuat data pesanan...</td>
                </tr>
              ) : recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm text-gray-700 dark:text-zinc-300">
                      <Link to={`/orders/${order.id}`} className="font-mono text-emas hover:underline">{order.id.split('-')[0]}</Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white">
                      {order.shipping_address ? order.shipping_address.split(' - ')[0] : 'Tanpa Nama'} <br/>
                      <span className="text-xs text-gray-500 dark:text-zinc-500">{order.shipping_address ? order.shipping_address.split(' - ')[1] : '-'}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-zinc-400">
                      {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {formatRupiah(order.total_amount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border
                        ${order.status === 'pending' ? 'bg-yellow-400/10 text-yellow-600 dark:text-yellow-500 border-yellow-400/20' : ''}
                        ${order.status === 'processing' ? 'bg-blue-400/10 text-blue-600 dark:text-blue-500 border-blue-400/20' : ''}
                        ${order.status === 'shipped' ? 'bg-indigo-400/10 text-indigo-600 dark:text-indigo-500 border-indigo-400/20' : ''}
                        ${order.status === 'delivered' ? 'bg-green-400/10 text-green-600 dark:text-green-500 border-green-400/20' : ''}
                        ${order.status === 'cancelled' ? 'bg-red-400/10 text-red-600 dark:text-red-500 border-red-400/20' : ''}
                      `}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                        <span className="text-2xl text-gray-400 dark:text-zinc-600">📦</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-zinc-400">Belum ada pesanan masuk</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
