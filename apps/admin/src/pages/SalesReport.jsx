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
  const [activeTab, setActiveTab] = useState('transactions'); // products | transactions
  
  // Date states
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [quickFilter, setQuickFilter] = useState('1m'); // 1d | 1w | 1m | 3m | ytd | all

  const getLocalDateString = (date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date - tzOffset).toISOString().slice(0, 10);
  };

  // Set default dates
  useEffect(() => {
    const today = new Date();
    const past = new Date();
    past.setMonth(today.getMonth() - 1);
    setDateRange({
      startDate: getLocalDateString(past),
      endDate: getLocalDateString(today),
    });
  }, []);

  const handleQuickFilter = (type) => {
    setQuickFilter(type);
    const today = new Date();
    let start = '';
    const end = getLocalDateString(today);

    if (type === '1d') {
      start = end;
    } else if (type === '1w') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      start = getLocalDateString(past);
    } else if (type === '1m') {
      const past = new Date();
      past.setMonth(today.getMonth() - 1);
      start = getLocalDateString(past);
    } else if (type === '3m') {
      const past = new Date();
      past.setMonth(today.getMonth() - 3);
      start = getLocalDateString(past);
    } else if (type === 'ytd') {
      start = `${today.getFullYear()}-01-01`;
    } else if (type === '1y') {
      const past = new Date();
      past.setFullYear(today.getFullYear() - 1);
      start = getLocalDateString(past);
    } else if (type === 'all') {
      start = '2020-01-01'; // Fetch all historical data
    }

    setDateRange({ startDate: start, endDate: end });
  };

  const fetchSalesData = async () => {
    if (!dateRange.startDate || !dateRange.endDate) return;
    setLoading(true);
    try {
      const start = new Date(`${dateRange.startDate}T00:00:00`).toISOString();
      const end = new Date(`${dateRange.endDate}T23:59:59`).toISOString();

      // 1. Fetch active orders
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
        .in('status', ['processing', 'shipped', 'delivered'])
        .gte('created_at', start)
        .lte('created_at', end);

      const { data: fetchedOrders, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // 2. Fetch archived (deleted) sales_records (with safety check if table doesn't exist yet)
      let fetchedArchive = [];
      try {
        let archiveQuery = supabase
          .from('sales_records')
          .select(`
            id,
            tracking_code,
            created_at,
            status,
            customer_name,
            shipping_cost,
            net_amount,
            items_count
          `)
          .gte('created_at', start)
          .lte('created_at', end);

        const { data: archiveData, error: archiveError } = await archiveQuery.order('created_at', { ascending: false });
        if (!archiveError) {
          fetchedArchive = archiveData || [];
        } else {
          console.warn('sales_records table might not exist yet. Please run migration.', archiveError);
        }
      } catch (err) {
        console.warn('Failed to fetch sales_records:', err);
      }

      // Map archive records to match orders structure
      const mappedArchive = fetchedArchive.map(item => ({
        id: item.id,
        tracking_code: item.tracking_code,
        created_at: item.created_at,
        status: item.status,
        shipping_cost: item.shipping_cost,
        total_amount: parseFloat(item.net_amount) + parseFloat(item.shipping_cost),
        profiles: { full_name: item.customer_name },
        shipping_address: item.customer_name, // fallback
        is_archived_record: true,
        items_count: item.items_count,
        order_items: []
      }));

      // Combine active and archived orders
      const combinedOrders = [...(fetchedOrders || []), ...mappedArchive];
      combinedOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setOrders(combinedOrders);

      // Calculations
      let totalRevenue = 0;
      let totalSold = 0;
      const productMap = {};

      combinedOrders.forEach(order => {
        // Revenue is calculated net (excluding shipping cost)
        const netAmount = parseFloat(order.total_amount) - parseFloat(order.shipping_cost);
        totalRevenue += netAmount >= 0 ? netAmount : 0;

        if (order.is_archived_record) {
          totalSold += order.items_count || 0;
        } else {
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
        }
      });

      const totalOrders = combinedOrders.length;
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

  // Aggregate statistics for charts (with smart grouping to prevent delays on long ranges)
  const getChartData = () => {
    if (orders.length === 0) return [];
    
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    let grouping = 'day';
    if (quickFilter) {
      if (quickFilter === '1d') grouping = 'minute';
      else if (['1w', '1m', '3m'].includes(quickFilter)) grouping = 'day';
      else if (['ytd', '1y'].includes(quickFilter)) grouping = 'week';
      else if (quickFilter === 'all') grouping = 'month';
    } else {
      if (diffDays <= 1) grouping = 'minute';
      else if (diffDays <= 90) grouping = 'day';
      else if (diffDays <= 366) grouping = 'week';
      else grouping = 'month';
    }

    if (grouping === 'minute') {
      const minuteMap = {};
      
      // Start anchor
      minuteMap['00:00'] = { revenue: 0, itemsSold: 0 };
      
      orders.forEach(order => {
        const date = new Date(order.created_at);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const timeKey = `${hours}:${minutes}`;
        
        const netAmount = parseFloat(order.total_amount) - parseFloat(order.shipping_cost);
        const cleanRevenue = netAmount >= 0 ? netAmount : 0;
        
        let itemsCount = 0;
        if (order.is_archived_record) {
          itemsCount = order.items_count || 0;
        } else {
          order.order_items?.forEach(item => {
            itemsCount += item.quantity;
          });
        }
        
        if (!minuteMap[timeKey]) {
          minuteMap[timeKey] = { revenue: 0, itemsSold: 0 };
        }
        minuteMap[timeKey].revenue += cleanRevenue;
        minuteMap[timeKey].itemsSold += itemsCount;
      });
      
      // End anchor
      const endAnchor = (dateRange.endDate === getLocalDateString(new Date())) 
        ? `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
        : '23:59';
        
      if (!minuteMap[endAnchor]) {
        minuteMap[endAnchor] = { revenue: 0, itemsSold: 0 };
      }
      
      return Object.keys(minuteMap)
        .sort()
        .map(timeKey => ({
          dateStr: timeKey,
          label: timeKey,
          revenue: minuteMap[timeKey].revenue,
          itemsSold: minuteMap[timeKey].itemsSold
        }));
    } else if (grouping === 'week') {
      const getStartOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        const startOfWeek = new Date(d.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);
        return startOfWeek;
      };

      const weeklyMap = {};
      let current = getStartOfWeek(start);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        weeklyMap[dateStr] = { revenue: 0, itemsSold: 0 };
        current.setDate(current.getDate() + 7);
      }

      orders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const weekStart = getStartOfWeek(orderDate);
        const dateStr = weekStart.toISOString().split('T')[0];
        
        const netAmount = parseFloat(order.total_amount) - parseFloat(order.shipping_cost);
        const cleanRevenue = netAmount >= 0 ? netAmount : 0;
        
        let itemsCount = 0;
        if (order.is_archived_record) {
          itemsCount = order.items_count || 0;
        } else {
          order.order_items?.forEach(item => {
            itemsCount += item.quantity;
          });
        }
        
        if (weeklyMap[dateStr] !== undefined) {
          weeklyMap[dateStr].revenue += cleanRevenue;
          weeklyMap[dateStr].itemsSold += itemsCount;
        } else {
          const closestWeekStr = Object.keys(weeklyMap).reduce((closest, curr) => {
            const currDate = new Date(curr);
            const closestDate = new Date(closest);
            return Math.abs(orderDate - currDate) < Math.abs(orderDate - closestDate) ? curr : closest;
          }, Object.keys(weeklyMap)[0]);
          
          if (closestWeekStr && weeklyMap[closestWeekStr]) {
            weeklyMap[closestWeekStr].revenue += cleanRevenue;
            weeklyMap[closestWeekStr].itemsSold += itemsCount;
          }
        }
      });

      return Object.keys(weeklyMap)
        .sort()
        .map(dateStr => {
          const startDate = new Date(dateStr);
          const formattedStart = startDate.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short'
          }).replace(/\./g, '');
          
          return {
            dateStr,
            label: `Mgg: ${formattedStart}`,
            revenue: weeklyMap[dateStr].revenue,
            itemsSold: weeklyMap[dateStr].itemsSold
          };
        });
    } else if (grouping === 'month') {
      const monthlyMap = {};
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[monthKey] = { revenue: 0, itemsSold: 0 };
        current.setMonth(current.getMonth() + 1);
      }

      orders.forEach(order => {
        const date = new Date(order.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const netAmount = parseFloat(order.total_amount) - parseFloat(order.shipping_cost);
        const cleanRevenue = netAmount >= 0 ? netAmount : 0;
        
        let itemsCount = 0;
        if (order.is_archived_record) {
          itemsCount = order.items_count || 0;
        } else {
          order.order_items?.forEach(item => {
            itemsCount += item.quantity;
          });
        }
        
        if (monthlyMap[monthKey] !== undefined) {
          monthlyMap[monthKey].revenue += cleanRevenue;
          monthlyMap[monthKey].itemsSold += itemsCount;
        }
      });

      return Object.keys(monthlyMap)
        .sort()
        .map(monthKey => {
          const [year, month] = monthKey.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          const formattedDate = date.toLocaleDateString('id-ID', {
            month: 'short',
            year: '2-digit'
          }).replace(/\./g, '');
          
          return {
            dateStr: monthKey,
            label: formattedDate,
            revenue: monthlyMap[monthKey].revenue,
            itemsSold: monthlyMap[monthKey].itemsSold
          };
        });
    } else {
      // Group by Day (detail view for 1W, 1M, 3M)
      const dailyMap = {};
      
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
        if (order.is_archived_record) {
          itemsCount = order.items_count || 0;
        } else {
          order.order_items?.forEach(item => {
            itemsCount += item.quantity;
          });
        }

        if (dailyMap[dateStr] !== undefined) {
          dailyMap[dateStr].revenue += cleanRevenue;
          dailyMap[dateStr].itemsSold += itemsCount;
        }
      });
      
      return Object.keys(dailyMap)
        .sort()
        .map(dateStr => {
          const formattedDate = new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: '2-digit'
          }).replace(/\./g, '');
          return {
            dateStr,
            label: formattedDate,
            revenue: dailyMap[dateStr].revenue,
            itemsSold: dailyMap[dateStr].itemsSold
          };
        });
    }
  };

  // Helper function to render a custom SVG Line Chart
  const renderChart = (title, key, color, gradientId, hoverPrefix, formatFn) => {
    return (
      <InteractiveChart
        title={title}
        chartData={getChartData()}
        dataKey={key}
        color={color}
        gradientId={gradientId}
        hoverPrefix={hoverPrefix}
        formatFn={formatFn}
      />
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
          <div className="flex flex-wrap gap-1 bg-gray-100/50 dark:bg-zinc-800/20 p-1 rounded-2xl border border-gray-200/50 dark:border-zinc-800/40">
            {[
              { id: '1d', label: '1D', tooltip: 'Hari Ini' },
              { id: '1w', label: '1W', tooltip: '7 Hari Terakhir' },
              { id: '1m', label: '1M', tooltip: '1 Bulan Terakhir' },
              { id: '3m', label: '3M', tooltip: '3 Bulan Terakhir' },
              { id: 'ytd', label: 'YTD', tooltip: 'Tahun Ini (Year to Date)' },
              { id: '1y', label: '1Y', tooltip: '1 Tahun Terakhir' },
              { id: 'all', label: 'ALL', tooltip: 'Semua Waktu' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => handleQuickFilter(f.id)}
                title={f.tooltip}
                className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                  quickFilter === f.id
                    ? 'bg-yellow-500 text-black shadow-glow'
                    : 'bg-transparent hover:bg-gray-200/60 dark:hover:bg-zinc-800/50 text-gray-500 dark:text-zinc-400'
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
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-200">Daftar Transaksi</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Cari resi / pelanggan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emas"
              />
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-emas border-t-transparent rounded-full animate-spin"></div>
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
                  <th className="pb-3 text-right">Total Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-gray-400 dark:text-zinc-500">
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

function InteractiveChart({ title, chartData, dataKey, color, gradientId, hoverPrefix, formatFn }) {
  const containerRef = React.useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const values = chartData.map(d => d[dataKey]);
  const maxVal = Math.max(...values, dataKey === 'revenue' ? 100000 : 5);

  const chartHeight = 220;
  const paddingTop = 25;
  const paddingBottom = 40;
  const paddingLeft = 40; // Increased to 40 to prevent leftmost date label from clipping
  const paddingRight = 110; // Extra room for long RP currency strings on the right
  const chartInnerHeight = chartHeight - paddingTop - paddingBottom;

  // Width of each step (day)
  const stepWidth = 65;
  const chartWidth = Math.max(500, chartData.length * stepWidth + paddingLeft + paddingRight);

  const points = chartData.map((d, index) => {
    const x = paddingLeft + (index / Math.max(chartData.length - 1, 1)) * (chartWidth - paddingLeft - paddingRight);
    const y = chartHeight - paddingBottom - (d[dataKey] / maxVal) * chartInnerHeight;
    return { x, y, label: d.label, val: d[dataKey] };
  });

  // Scroll to the end (rightmost side) on mount or data change
  React.useEffect(() => {
    if (containerRef.current) {
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollLeft = containerRef.current.scrollWidth;
          setScrollX(containerRef.current.scrollLeft);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [chartData]);

  const getCurvePath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 2] || pts[0];
      const p1 = pts[i - 1];
      const p2 = pts[i];
      const p3 = pts[i + 1] || p2;
      
      const cp1x = p1.x + (p2.x - p0.x) / 12;
      const cp1y = p1.y + (p2.y - p0.y) / 12;
      const cp2x = p2.x - (p3.x - p1.x) / 12;
      const cp2y = p2.y - (p3.y - p1.y) / 12;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  let linePath = '';
  let areaPath = '';
  if (points.length > 0) {
    linePath = getCurvePath(points);
    areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`;
  }

  // Drag handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredPoint(null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      const x = e.pageX - containerRef.current.offsetLeft;
      const walk = (x - startX) * 1.5;
      containerRef.current.scrollLeft = scrollLeft - walk;
      setScrollX(containerRef.current.scrollLeft);
      return;
    }

    if (points.length === 0) return;

    // Find nearest point
    const rect = containerRef.current.getBoundingClientRect();
    const mouseXInContainer = e.clientX - rect.left;
    const mouseXInSvg = mouseXInContainer + containerRef.current.scrollLeft;

    let closestPoint = points[0];
    let closestIdx = 0;
    let minDiff = Math.abs(points[0].x - mouseXInSvg);

    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i].x - mouseXInSvg);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = points[i];
        closestIdx = i;
      }
    }

    // Only hover if mouse is within chart boundaries
    if (mouseXInSvg >= paddingLeft - 10 && mouseXInSvg <= chartWidth - paddingRight + 10) {
      setHoveredPoint({
        idx: closestIdx,
        x: closestPoint.x,
        y: closestPoint.y,
        label: closestPoint.label,
        val: closestPoint.val
      });
    } else {
      setHoveredPoint(null);
    }
  };

  const handleScroll = (e) => {
    setScrollX(e.target.scrollLeft);
  };

  const formatLabel = (v) => {
    return hoverPrefix ? `${hoverPrefix} ${formatFn(v)}` : formatFn(v);
  };

  // Tooltip horizontal clamping calculations
  const containerWidth = containerRef.current ? containerRef.current.clientWidth : 500;
  const halfTooltipWidth = 65;
  const tooltipCenter = hoveredPoint ? hoveredPoint.x - scrollX : 0;
  const clampedLeft = Math.max(halfTooltipWidth + 5, Math.min(containerWidth - halfTooltipWidth - 5, tooltipCenter));

  return (
    <div className="relative bg-white dark:bg-zinc-900/40 border border-gray-200 dark:border-zinc-800/60 rounded-3xl p-5 shadow-soft flex-1 min-w-[280px]">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-200 mb-4">{title}</h3>
      
      {/* Wrapper for scrollable chart and sticky Y-labels (overflow-visible to prevent tooltip vertical clipping) */}
      <div className="relative w-full overflow-visible">
        {/* Scrollable Container */}
        <div 
          ref={containerRef}
          className={`relative w-full overflow-x-auto overflow-y-hidden select-none no-scrollbar ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onScroll={handleScroll}
        >
          <div style={{ width: `${chartWidth}px`, height: `${chartHeight}px` }} className="relative">
            <svg 
              width={chartWidth} 
              height={chartHeight} 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="absolute inset-0 pointer-events-none"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              <line 
                x1={paddingLeft} 
                y1={paddingTop} 
                x2={chartWidth - paddingRight} 
                y2={paddingTop} 
                stroke="currentColor" 
                className="text-gray-100 dark:text-zinc-800/40" 
                strokeWidth="1" 
                strokeDasharray="4 4" 
              />
              <line 
                x1={paddingLeft} 
                y1={paddingTop + chartInnerHeight / 2} 
                x2={chartWidth - paddingRight} 
                y2={paddingTop + chartInnerHeight / 2} 
                stroke="currentColor" 
                className="text-gray-100 dark:text-zinc-800/40" 
                strokeWidth="1" 
                strokeDasharray="4 4" 
              />
              <line 
                x1={paddingLeft} 
                y1={chartHeight - paddingBottom} 
                x2={chartWidth - paddingRight} 
                y2={chartHeight - paddingBottom} 
                stroke="currentColor" 
                className="text-gray-200 dark:text-zinc-800" 
                strokeWidth="1.5" 
              />

              {/* Vertical grid lines and date labels */}
              {points.map((p, idx) => (
                <React.Fragment key={idx}>
                  {/* Vertical grid line */}
                  <line 
                    x1={p.x} 
                    y1={paddingTop} 
                    x2={p.x} 
                    y2={chartHeight - paddingBottom} 
                    stroke="currentColor" 
                    className="text-gray-100/50 dark:text-zinc-800/20" 
                    strokeWidth="1" 
                    strokeDasharray="3 3" 
                  />
                  {/* Date Label */}
                  <text 
                    x={p.x} 
                    y={chartHeight - 15} 
                    className="fill-gray-400 dark:fill-zinc-500 text-[9px] font-medium" 
                    textAnchor="middle"
                  >
                    {p.label}
                  </text>
                </React.Fragment>
              ))}

              {/* Area & Line */}
              {points.length > 0 && (
                <>
                  <path d={areaPath} fill={`url(#${gradientId})`} />
                  <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}

              {/* Vertical guide line on hover */}
              {hoveredPoint && (
                <line 
                  x1={hoveredPoint.x} 
                  y1={paddingTop} 
                  x2={hoveredPoint.x} 
                  y2={chartHeight - paddingBottom} 
                  stroke={color} 
                  strokeWidth="1.5" 
                  strokeDasharray="3 3"
                />
              )}

              {/* Active dot on hover */}
              {hoveredPoint && (
                <circle 
                  cx={hoveredPoint.x} 
                  cy={hoveredPoint.y} 
                  r="6" 
                  fill="#FFF" 
                  stroke={color} 
                  strokeWidth="3"
                />
              )}
            </svg>
          </div>
        </div>

        {/* Custom Tooltip rendered in overflow-visible parent so it never clips at the top or left */}
        {hoveredPoint && (
          <div 
            className="absolute bg-zinc-950 border border-zinc-800 text-white rounded-xl p-2.5 shadow-2xl text-[10px] pointer-events-none z-10 animate-fade-in"
            style={{ 
              left: `${clampedLeft}px`, 
              top: `${hoveredPoint.y - 12}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="font-semibold text-zinc-400">{hoveredPoint.label}</div>
            <div className="font-bold text-emas mt-0.5">{hoverPrefix ? `${hoverPrefix} ` : ''}{formatFn(hoveredPoint.val)}</div>
          </div>
        )}

        {/* Sticky Y-axis labels panel with right-fade gradient */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-[115px] pointer-events-none text-gray-400 dark:text-zinc-500 text-[10px] font-semibold bg-gradient-to-l from-white via-white/95 to-transparent dark:from-zinc-900/90 dark:via-zinc-900/60 flex flex-col justify-between pl-8 select-none"
          style={{ height: `${chartHeight}px` }}
        >
          <div className="absolute left-8" style={{ top: `${paddingTop - 7}px` }}>{formatLabel(maxVal)}</div>
          <div className="absolute left-8" style={{ top: `${paddingTop + chartInnerHeight / 2 - 7}px` }}>{formatLabel(Math.round(maxVal / 2))}</div>
          <div className="absolute left-8" style={{ top: `${chartHeight - paddingBottom - 7}px` }}>{formatLabel(0)}</div>
        </div>
      </div>
    </div>
  );
}
