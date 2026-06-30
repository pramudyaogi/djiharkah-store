import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Package, ShoppingBag, Search, Calendar, CreditCard, RefreshCw, BarChart3 } from 'lucide-react';

export default function SalesReport() {
  const [orders, setOrders] = useState([]);
  const [productsBreakdown, setProductsBreakdown] = useState([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalSold: 0,
    totalOrders: 0,
    averageValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('sold_count'); // sold_count | revenue | name
  const [activeTab, setActiveTab] = useState('products'); // products | transactions
  
  // Date states
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [quickFilter, setQuickFilter] = useState('month'); // today | week | month | all

  // Hover state for charts
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const getLocalDateString = (date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date - tzOffset).toISOString().slice(0, 10);
  };

  // Set default dates
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateRange({
      startDate: getLocalDateString(firstDay),
      endDate: getLocalDateString(today),
    });
  }, []);

  const handleQuickFilter = (type) => {
    setQuickFilter(type);
    const today = new Date();
    let start = '';
    const end = getLocalDateString(today);

    if (type === 'today') {
      start = end;
    } else if (type === 'week') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      start = getLocalDateString(past);
    } else if (type === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = getLocalDateString(firstDay);
    } else if (type === 'all') {
      start = '2026-01-01'; // Default system start date
    }

    setDateRange({ startDate: start, endDate: end });
  };

  const fetchSalesData = async () => {
    if (!dateRange.startDate || !dateRange.endDate) return;
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          tracking_code,
          created_at,
          status,
          total_amount,
          shipping_cost,
          profiles (full_name),
          shipping_address,
          order_items (
            quantity,
            unit_price,
            product_id,
            products (
              id, name, image_url, stock,
              categories (name)
            )
          )
        `)
        .in('status', ['processing', 'shipped', 'delivered']);

      // Convert local date string to start and end ISO strings
      const start = new Date(`${dateRange.startDate}T00:00:00`).toISOString();
      const end = new Date(`${dateRange.endDate}T23:59:59`).toISOString();
      
      query = query.gte('created_at', start).lte('created_at', end);

      const { data: fetchedOrders, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const safeOrders = fetchedOrders || [];
      setOrders(safeOrders);

      // Calculations
      let totalRevenue = 0;
      let totalSold = 0;
      const productMap = {};

      safeOrders.forEach(order => {
        // Revenue is calculated net (excluding shipping cost)
        const netAmount = parseFloat(order.total_amount) - parseFloat(order.shipping_cost);
        totalRevenue += netAmount >= 0 ? netAmount : 0;

        order.order_items?.forEach(item => {
          totalSold += item.quantity;
          const p = item.products;
          if (!p) return;

          if (!productMap[p.id]) {
            productMap[p.id] = {
              product: p,
              totalSold: 0,
              totalRevenue: 0,
            };
          }
          productMap[p.id].totalSold += item.quantity;
          productMap[p.id].totalRevenue += item.quantity * parseFloat(item.unit_price);
        });
      });

      const totalOrders = safeOrders.length;
      const averageValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setSummary({
        totalRevenue,
        totalSold,
        totalOrders,
        averageValue
      });

      setProductsBreakdown(Object.values(productMap));
    } catch (error) {
      console.error('Error fetching sales report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [dateRange]);

  // Aggregate daily statistics for charts
  const getChartData = () => {
    if (orders.length === 0) return [];
    
    const dailyMap = {};
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    // Fill all dates in range with 0
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = { revenue: 0, itemsSold: 0 };
    }
    
    orders.forEach(order => {
      const dateStr = new Date(order.created_at).toISOString().split('T')[0];
      const netAmount = parseFloat(order.total_amount) - parseFloat(order.shipping_cost);
      const cleanRevenue = netAmount >= 0 ? netAmount : 0;
      
      let itemsCount = 0;
      order.order_items?.forEach(item => {
        itemsCount += item.quantity;
      });

      if (dailyMap[dateStr] !== undefined) {
        dailyMap[dateStr].revenue += cleanRevenue;
        dailyMap[dateStr].itemsSold += itemsCount;
      } else {
        dailyMap[dateStr] = { revenue: cleanRevenue, itemsSold: itemsCount };
      }
    });
    
    return Object.keys(dailyMap)
      .sort()
      .map(dateStr => {
        const formattedDate = new Date(dateStr).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short'
        });
        return {
          dateStr,
          label: formattedDate,
          revenue: dailyMap[dateStr].revenue,
          itemsSold: dailyMap[dateStr].itemsSold
        };
      });
  };

  // Helper function to render a custom SVG Line Chart
  const renderChart = (title, key, color, gradientId, hoverPrefix, formatFn) => {
    const chartData = getChartData();
    const values = chartData.map(d => d[key]);
    const maxVal = Math.max(...values, key === 'revenue' ? 100000 : 5);
    
    const width = 500;
    const height = 180;
    const paddingX = 45;
    const paddingY = 20;

    const points = chartData.map((d, index) => {
      const x = paddingX + (index / Math.max(chartData.length - 1, 1)) * (width - paddingX * 2);
      const y = height - paddingY - (d[key] / maxVal) * (height - paddingY * 2);
      return { x, y, label: d.label, val: d[key] };
    });

    let linePath = '';
    let areaPath = '';
    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
    }

    return (
      <div className="relative bg-white dark:bg-zinc-900/40 border border-gray-200 dark:border-zinc-800/60 rounded-3xl p-5 shadow-soft flex-1 min-w-[280px]">
        <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-200 mb-4">{title}</h3>
        <div className="relative h-[180px] w-full">
          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="currentColor" className="text-gray-100 dark:text-zinc-800/40" strokeWidth="1" strokeDasharray="4 4" />
            <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="currentColor" className="text-gray-100 dark:text-zinc-800/40" strokeWidth="1" strokeDasharray="4 4" />
            <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="currentColor" className="text-gray-200 dark:text-zinc-800" strokeWidth="1.5" />

            {/* Area & Line */}
            {points.length > 0 && (
              <>
                <path d={areaPath} fill={`url(#${gradientId})`} />
                <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}

            {/* Interaction Circles */}
            {points.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={hoveredPoint?.key === key && hoveredPoint?.idx === idx ? 6 : 4}
                fill={hoveredPoint?.key === key && hoveredPoint?.idx === idx ? '#fff' : color}
                stroke={color}
                strokeWidth={2}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredPoint({ key, idx, x: p.x, y: p.y, label: p.label, val: p.val })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}
          </svg>

          {/* Custom Tooltip */}
          {hoveredPoint && hoveredPoint.key === key && (
            <div 
              className="absolute bg-zinc-950 border border-zinc-800 text-white rounded-xl p-2.5 shadow-2xl text-[10px] pointer-events-none z-10 animate-fade-in"
              style={{ 
                left: `${(hoveredPoint.x / width) * 100}%`, 
                top: `${(hoveredPoint.y / height) * 100 - 55}px`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="font-semibold text-zinc-400">{hoveredPoint.label}</div>
              <div className="font-bold text-emas mt-0.5">{hoverPrefix} {formatFn(hoveredPoint.val)}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Filter & Sort for Products Breakdown
  const filteredProducts = productsBreakdown
    .filter(r => r.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'sold_count') return b.totalSold - a.totalSold;
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
      if (sortBy === 'name') return (a.product?.name || '').localeCompare(b.product?.name || '');
      return 0;
    });

  // Filter for Transaction List
  const filteredTransactions = orders.filter(o => {
    const customerName = o.profiles?.full_name || o.shipping_address?.split(' - ')[0] || 'Tamu';
    return (
      o.tracking_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const statCards = [
    {
      label: 'Omzet Bersih (Pencatatan)',
      value: `Rp ${summary.totalRevenue.toLocaleString('id-ID')}`,
      subtext: 'Excl. Ongkir',
      icon: TrendingUp,
      color: 'text-yellow-600 dark:text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Jumlah Transaksi',
      value: summary.totalOrders.toLocaleString('id-ID'),
      subtext: 'Status terproses',
      icon: ShoppingBag,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Produk Terjual',
      value: `${summary.totalSold.toLocaleString('id-ID')} pcs`,
      subtext: 'Kuantitas barang',
      icon: Package,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Rata-rata Transaksi',
      value: `Rp ${Math.round(summary.averageValue).toLocaleString('id-ID')}`,
      subtext: 'Rata-rata keranjang',
      icon: CreditCard,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-playfair font-bold text-gray-900 dark:text-white tracking-wide flex items-center gap-2">
            <BarChart3 className="text-emas" size={28} /> Laporan Penjualan
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2">
            Pantau performa penjualan produk dan analisis omzet toko Anda berdasarkan pesanan terproses.
          </p>
        </div>
        <button
          onClick={fetchSalesData}
          className="self-start md:self-auto p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-white rounded-xl transition-all"
          title="Segarkan Data"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter Card */}
      <div className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-zinc-800/60 p-6 shadow-soft space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'week', label: '7 Hari Terakhir' },
              { id: 'month', label: 'Bulan Ini' },
              { id: 'all', label: 'Semua Waktu' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => handleQuickFilter(f.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  quickFilter === f.id
                    ? 'bg-yellow-500 text-black shadow-glow'
                    : 'bg-gray-100 dark:bg-zinc-800/50 hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Date Picker Form */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => {
                  setQuickFilter('');
                  setDateRange(prev => ({ ...prev, startDate: e.target.value }));
                }}
                className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emas"
              />
            </div>
            <span className="text-gray-400 dark:text-zinc-600 text-sm font-medium">s/d</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => {
                  setQuickFilter('');
                  setDateRange(prev => ({ ...prev, endDate: e.target.value }));
                }}
                className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emas"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-zinc-800/60 p-6 shadow-soft flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}>
                <Icon className={s.color} size={22} />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-zinc-400 font-medium">{s.label}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{s.value}</div>
                <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">{s.subtext}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChart(
          'Tren Omzet Harian',
          'revenue',
          '#EAB308',
          'goldChartGradient',
          'Rp',
          (val) => val.toLocaleString('id-ID')
        )}
        {renderChart(
          'Tren Produk Terjual',
          'itemsSold',
          '#10B981',
          'greenChartGradient',
          '',
          (val) => `${val.toLocaleString('id-ID')} pcs`
        )}
      </div>

      {/* Tabs and Data Table */}
      <div className="bg-white/80 dark:bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-zinc-800/60 p-6 shadow-soft space-y-6">
        
        {/* Navigation & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-zinc-800/60 pb-4">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setActiveTab('products');
                setSearchTerm('');
              }}
              className={`pb-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'products'
                  ? 'border-emas text-emas'
                  : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Ringkasan Produk
            </button>
            <button
              onClick={() => {
                setActiveTab('transactions');
                setSearchTerm('');
              }}
              className={`pb-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'transactions'
                  ? 'border-emas text-emas'
                  : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Daftar Transaksi
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder={activeTab === 'products' ? "Cari produk..." : "Cari resi / pelanggan..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emas"
              />
            </div>

            {/* Sort for Products */}
            {activeTab === 'products' && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-44 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emas"
              >
                <option value="sold_count">Terlaris</option>
                <option value="revenue">Pendapatan Tertinggi</option>
                <option value="name">Nama A-Z</option>
              </select>
            )}
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : activeTab === 'products' ? (
          /* Products Breakdown Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-sm font-bold text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pl-2">No</th>
                  <th className="pb-3">Produk</th>
                  <th className="pb-3">Kategori</th>
                  <th className="pb-3 text-right">Stok Sisa</th>
                  <th className="pb-3 text-right">Kuantitas Terjual</th>
                  <th className="pb-3 text-right">Pendapatan Kotor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-gray-400 dark:text-zinc-500">
                      Tidak ada produk terjual dalam periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((row, idx) => (
                    <tr key={row.product?.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                      <td className="py-4 pl-2 text-gray-400 dark:text-zinc-500">{idx + 1}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-zinc-700">
                            {row.product?.image_url ? (
                              <img src={row.product.image_url} alt={row.product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">NO IMG</div>
                            )}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white line-clamp-2 max-w-xs">{row.product?.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-gray-500 dark:text-zinc-400">{row.product?.categories?.name || '-'}</td>
                      <td className="py-4 text-right font-medium">
                        <span className={(row.product?.stock ?? 0) === 0 ? 'text-red-500 font-bold' : 'text-gray-900 dark:text-white'}>
                          {row.product?.stock ?? 0}
                        </span>
                      </td>
                      <td className="py-4 text-right font-bold text-yellow-600 dark:text-yellow-400">
                        {row.totalSold} pcs
                      </td>
                      <td className="py-4 text-right font-bold text-gray-900 dark:text-white">
                        Rp {row.totalRevenue.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Transaction List Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-sm font-bold text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Tanggal</th>
                  <th className="pb-3">Kode Resi</th>
                  <th className="pb-3">Pelanggan</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Ongkir</th>
                  <th className="pb-3 text-right">Total Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-gray-400 dark:text-zinc-500">
                      Tidak ada transaksi dalam periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(o => {
                    const customerName = o.profiles?.full_name || o.shipping_address?.split(' - ')[0] || 'Tamu';
                    const netAmount = parseFloat(o.total_amount) - parseFloat(o.shipping_cost);
                    const formattedDate = new Date(o.created_at).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    });
                    
                    return (
                      <tr key={o.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20">
                        <td className="py-4 pl-2 text-gray-500 dark:text-zinc-400 font-medium">
                          {formattedDate}
                        </td>
                        <td className="py-4 font-mono font-bold text-gray-900 dark:text-white tracking-wide">
                          {o.tracking_code}
                        </td>
                        <td className="py-4 text-gray-800 dark:text-zinc-200 font-semibold">
                          {customerName}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            o.status === 'processing'
                              ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                              : o.status === 'shipped'
                              ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
                              : 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20'
                          }`}>
                            {o.status === 'processing' ? 'Diproses' : o.status === 'shipped' ? 'Dikirim' : 'Selesai'}
                          </span>
                        </td>
                        <td className="py-4 text-right font-medium text-gray-500 dark:text-zinc-400">
                          Rp {Number(o.shipping_cost).toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 text-right font-bold text-gray-900 dark:text-white">
                          Rp {netAmount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
