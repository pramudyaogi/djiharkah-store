import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye, Clock, Package, Truck, CheckCircle, XCircle, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrders } from '../services/orders';

const countryCodesList = [
  { name: 'Indonesia', code: '+62', flag: '🇮🇩' },
  { name: 'Malaysia', code: '+60', flag: '🇲🇾' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'Brunei', code: '+673', flag: '🇧🇳' },
  { name: 'Thailand', code: '+66', flag: '🇹🇭' },
  { name: 'Philippines', code: '+63', flag: '🇵🇭' },
  { name: 'Japan', code: '+81', flag: '🇯🇵' },
  { name: 'China', code: '+86', flag: '🇨🇳' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
];

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Selection states
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // Modal states
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    orderId: null,
    trackingCode: '',
    isBulk: false
  });
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    trackingCode: ''
  });

  const [productModal, setProductModal] = useState({
    isOpen: false,
    editIndex: -1,
    item: { productId: '', quantity: 1, isCustom: false, customName: '', customPrice: '' }
  });

  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalCategoryId, setModalCategoryId] = useState('');



  // Manual Order states
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('IDR');
  const [autoCalculateShipping, setAutoCalculateShipping] = useState(true);

  const [manualOrder, setManualOrder] = useState({
    name: '',
    phoneCode: '+62',
    phoneLocal: '',
    addressDetails: {
      street: '',
      subdistrict: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Indonesia'
    },
    notes: '',
    items: [],
    shippingCost: 0,
    negotiatedPrice: '',
    status: 'processing'
  });
  
  const exchangeRates = {
    IDR: 1,
    MYR: 0.00030,
    SGD: 0.000085,
    BND: 0.000085,
    THB: 0.0023,
    PHP: 0.0035,
    JPY: 0.0095,
    CNY: 0.00045,
    EUR: 0.000058,
    USD: 0.000063
  };

  const [manualOrderLoading, setManualOrderLoading] = useState(false);
  const [manualOrderErrors, setManualOrderErrors] = useState({});
  const [isAddressSaved, setIsAddressSaved] = useState(false);

  useEffect(() => {
    if (isManualModalOpen) {
      fetchActiveProducts();
      fetchCategories();
    }
  }, [isManualModalOpen]);

  const fetchActiveProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock, category_id, free_shipping')
        .eq('is_active', true)
        .order('name');
      if (!error && data) {
        setProductsList(data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      if (!error && data) {
        setCategoriesList(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  

  // Calculate shipping cost automatically (only when address is saved)
  const calculateManualShipping = async (provinceName) => {
    if (!autoCalculateShipping) return;

    if (!provinceName?.trim() || manualOrder.items.length === 0) {
      setManualOrder(prev => ({ ...prev, shippingCost: '0' }));
      return;
    }

    const isDomestic = provinceName.toLowerCase().includes('indonesia') || 
                       provinceName.toLowerCase().includes('id') || 
                       provinceName.toLowerCase().includes('dki') || 
                       provinceName.toLowerCase().includes('jawa') ||
                       provinceName.toLowerCase().includes('sumatera') ||
                       provinceName.toLowerCase().includes('bali') ||
                       provinceName.toLowerCase().includes('sulawesi') ||
                       provinceName.toLowerCase().includes('kalimantan') ||
                       provinceName.toLowerCase().includes('papua') ||
                       provinceName.toLowerCase().includes('nusa');

    let baseShipping = isDomestic ? 15000 : 150000;

    if (isDomestic) {
      try {
        const { data, error } = await supabase
          .from('shipping_rates')
          .select('cost')
          .ilike('province', `%${provinceName.trim()}%`);
          
        if (!error && data && data.length > 0) {
          baseShipping = parseFloat(data[0].cost);
        }
      } catch (err) {
        console.error('Error fetching manual shipping rate:', err);
      }
    }

    // Hitung total harga semua item dan item yang non-gratis ongkir
    let totalSubtotal = 0;
    let totalNonFreeSubtotal = 0;

    manualOrder.items.forEach(item => {
      let price = 0;
      let isFree = false; // Custom product diasumsikan berbayar (tidak gratis ongkir)

      if (item.isCustom) {
        price = parseFloat(item.customPrice) || 0;
      } else {
        const product = productsList.find(p => p.id === item.productId);
        if (product) {
          price = product.price;
          isFree = product.free_shipping !== false; // default true jika tidak false
        }
      }

      const itemSubtotal = (parseInt(item.quantity) || 0) * price;
      totalSubtotal += itemSubtotal;
      
      if (!isFree) {
        totalNonFreeSubtotal += itemSubtotal;
      }
    });

    if (totalSubtotal === 0) {
      setManualOrder(prev => ({ ...prev, shippingCost: '0' }));
      return;
    }

    // Hitung proporsi ongkir
    const rawShippingCost = baseShipping * (totalNonFreeSubtotal / totalSubtotal);
    
    // Bulatkan ke kelipatan Rp 500 terdekat
    const finalShippingCost = Math.round(rawShippingCost / 500) * 500;

    setManualOrder(prev => ({ ...prev, shippingCost: String(finalShippingCost) }));
  };

  const handleSaveAddress = () => {
    const errors = {};
    if (!manualOrder.addressDetails.street.trim()) errors.street = 'Jalan / Detail alamat wajib diisi';
    if (!manualOrder.addressDetails.city.trim()) errors.city = 'Kota / Kabupaten wajib diisi';
    if (!manualOrder.addressDetails.province.trim()) errors.province = 'Provinsi wajib diisi';
    
    if (Object.keys(errors).length > 0) {
      setManualOrderErrors(prev => ({ ...prev, ...errors }));
      return;
    }
    
    setManualOrderErrors(prev => {
      const { street, city, province, address, ...rest } = prev;
      return rest;
    });
    
    setIsAddressSaved(true);
    if (autoCalculateShipping) {
      calculateManualShipping(manualOrder.addressDetails.province);
    }
  };

  // Recalculate shipping if products change and address is already saved
  useEffect(() => {
    if (isAddressSaved && autoCalculateShipping) {
      calculateManualShipping(manualOrder.addressDetails.province);
    }
  }, [manualOrder.items, autoCalculateShipping, isAddressSaved]);

  const resetManualForm = () => {
    setManualOrder({
      name: '',
      phoneCode: '+62',
      phoneLocal: '',
      addressDetails: { street: '', subdistrict: '', city: '', province: '', postalCode: '', country: 'Indonesia' },
      notes: '',
      items: [],
      shippingCost: '',
      negotiatedPrice: '',
      status: 'processing'
    });
    setSelectedCategoryId('');
    setSelectedCurrency('IDR');
    setAutoCalculateShipping(true);
    setIsAddressSaved(false);
    setManualOrderErrors({});
  };

  
  const handleOpenProductModal = (index = -1) => {
    setModalSearchQuery('');
    setModalCategoryId('');
    if (index >= 0) {
      setProductModal({ isOpen: true, editIndex: index, item: { ...manualOrder.items[index] }, errors: {} });
    } else {
      setProductModal({ isOpen: true, editIndex: -1, item: { productId: '', quantity: '', isCustom: false, customName: '', customPrice: '' }, errors: {} });
    }
  };

  const handleSaveProductModal = () => {
    const { item, editIndex } = productModal;
    const errors = {};
    
    // Validation
    if (item.isCustom) {
      if (!item.customName.trim()) errors.customName = 'Nama produk wajib diisi';
      if (!item.customPrice || parseFloat(item.customPrice) <= 0) errors.customPrice = 'Harga wajib diisi';
    } else {
      if (!item.productId) errors.productId = 'Pilih produk terlebih dahulu';
    }
    const qty = parseInt(item.quantity) || 0;
    if (qty <= 0) errors.quantity = 'Kuantitas minimal 1';

    if (Object.keys(errors).length > 0) {
      setProductModal(prev => ({ ...prev, errors }));
      return;
    }

    setManualOrder(prev => {
      const newItems = [...prev.items];
      if (editIndex >= 0) {
        newItems[editIndex] = { ...item, quantity: qty };
      } else {
        newItems.push({ ...item, quantity: qty });
      }
      return { ...prev, items: newItems };
    });
    setProductModal({ isOpen: false, editIndex: -1, item: { productId: '', quantity: '', isCustom: false, customName: '', customPrice: '' }, errors: {} });
  };

  const handleRemoveItem = (index) => {
    setManualOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };


  const handleManualOrderSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!manualOrder.name.trim()) errors.name = 'Nama penerima wajib diisi';
    if (!manualOrder.phoneLocal.trim()) errors.phone = 'Nomor telepon wajib diisi';
    
    // Validate address details only if status is processing
    if (manualOrder.status === 'processing') {
      if (!manualOrder.addressDetails.street.trim()) errors.street = 'Jalan / Detail alamat wajib diisi';
      if (!manualOrder.addressDetails.city.trim()) errors.city = 'Kota / Kabupaten wajib diisi';
      if (!manualOrder.addressDetails.province.trim()) errors.province = 'Provinsi wajib diisi';
      if (!manualOrder.addressDetails.country.trim()) errors.country = 'Negara wajib diisi';
    }

    if (manualOrder.items.length === 0) {
      errors.items = "Minimal 1 produk harus ditambahkan.";
    }

    let hasItemErrors = false;
    manualOrder.items.forEach((item, index) => {
      if (!item.productId) {
        errors[`item_product_${index}`] = 'Pilih produk';
        hasItemErrors = true;
      }
      if (item.quantity <= 0) {
        errors[`item_qty_${index}`] = 'Kuantitas min 1';
        hasItemErrors = true;
      }
      if (item.productId) {
        const selectedProd = productsList.find(p => p.id === item.productId);
        if (selectedProd && selectedProd.stock < item.quantity) {
          errors[`item_qty_${index}`] = `Stok tidak mencukupi (Tersedia: ${selectedProd.stock})`;
          hasItemErrors = true;
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setManualOrderErrors(errors);
      return;
    }

    setManualOrderErrors({});
    setManualOrderLoading(true);

    try {
      const fullPhone = `${manualOrder.phoneCode} ${manualOrder.phoneLocal.trim()}`;
      
      const parts = [
        manualOrder.addressDetails.street.trim(),
        manualOrder.addressDetails.subdistrict.trim() ? `Kec. ${manualOrder.addressDetails.subdistrict.trim()}` : '',
        manualOrder.addressDetails.city.trim(),
        manualOrder.addressDetails.province.trim(),
        manualOrder.addressDetails.postalCode.trim() ? `Kode Pos ${manualOrder.addressDetails.postalCode.trim()}` : '',
        manualOrder.addressDetails.country.trim()
      ].filter(Boolean);

      const formattedAddressOnly = parts.join(', ');
      const fullAddress = manualOrder.notes.trim() 
        ? `${formattedAddressOnly}\n\nCatatan: ${manualOrder.notes.trim()}` 
        : formattedAddressOnly;

      const formattedItems = manualOrder.items.map(item => {
        if (item.isCustom) {
          return {
            product_id: null,
            custom_product_name: item.customName.trim(),
            quantity: parseInt(item.quantity) || 1,
            unit_price: parseFloat(item.customPrice) || 0
          };
        } else {
          const product = productsList.find(p => p.id === item.productId);
          return {
            product_id: item.productId,
            custom_product_name: null,
            quantity: parseInt(item.quantity) || 1,
            unit_price: product ? product.price : 0
          };
        }
      });

      const parsedNegotiatedPrice = manualOrder.negotiatedPrice ? parseFloat(manualOrder.negotiatedPrice) : null;
      const finalNegotiatedPrice = parsedNegotiatedPrice >= 0 ? parsedNegotiatedPrice : null;

      const { data: orderData, error: rpcError } = await supabase.rpc('create_manual_order', {
        p_name: manualOrder.name.trim(),
        p_phone: fullPhone,
        p_email: '',
        p_address: fullAddress,
        p_status: manualOrder.status,
        p_shipping_cost: parseFloat(manualOrder.shippingCost) || 0,
        p_negotiated_price: finalNegotiatedPrice,
        p_notes: manualOrder.notes.trim(),
        p_items: formattedItems
      });

      if (rpcError) {
        throw rpcError;
      }

      resetManualForm();
      setIsManualModalOpen(false);
      setSuccessModal({ isOpen: true, trackingCode: orderData.tracking_code });
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Gagal membuat pesanan: ' + err.message);
    } finally {
      setManualOrderLoading(false);
    }
  };

  const autoCleanupExpiredOrders = async () => {
    try {
      // 1. Delete cancelled orders older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { error: err1 } = await supabase
        .from('orders')
        .delete()
        .eq('status', 'cancelled')
        .lt('created_at', sevenDaysAgo.toISOString());
        
      if (err1) console.error('Failed to auto-cleanup cancelled orders:', err1);
      
      // 2. Delete completed (delivered) orders older than 100 days
      const hundredDaysAgo = new Date();
      hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100);
      
      const { error: err2 } = await supabase
        .from('orders')
        .delete()
        .eq('status', 'delivered')
        .lt('created_at', hundredDaysAgo.toISOString());
        
      if (err2) console.error('Failed to auto-cleanup delivered orders:', err2);
      
    } catch (err) {
      console.error('Error running orders auto-cleanup:', err);
    }
  };

  useEffect(() => {
    autoCleanupExpiredOrders();
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await getOrders();
      setOrders(data || []);
      // Reset selection when reloading
      setSelectedOrderIds([]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'Semua Pesanan' },
    { id: 'pending', label: 'Menunggu Konfirmasi' },
    { id: 'processing', label: 'Diproses' },
    { id: 'shipped', label: 'Dikirim' },
    { id: 'delivered', label: 'Selesai' },
    { id: 'cancelled', label: 'Dibatalkan' },
  ];

  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => order.status === activeTab);

  // Helper: check if order is deletable (status delivered or cancelled)
  const isSelectable = (order) => {
    return order.status === 'delivered' || order.status === 'cancelled';
  };

  const selectableOrdersInTab = filteredOrders.filter(isSelectable);

  const showSelectColumn = activeTab === 'delivered' || activeTab === 'cancelled';

  const handleSelectRow = (id) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const selectableIds = selectableOrdersInTab.map(o => o.id);
    const allSelectedInTab = selectableIds.every(id => selectedOrderIds.includes(id));

    if (allSelectedInTab) {
      // Remove all selectable in this tab from selection
      setSelectedOrderIds(prev => prev.filter(id => !selectableIds.includes(id)));
    } else {
      // Add all selectable in this tab to selection (avoid duplicates)
      setSelectedOrderIds(prev => [...new Set([...prev, ...selectableIds])]);
    }
  };

  const isAllSelected = selectableOrdersInTab.length > 0 && 
    selectableOrdersInTab.map(o => o.id).every(id => selectedOrderIds.includes(id));

  // Open single delete confirmation modal
  const handleOpenDelete = (id, trackingCode) => {
    setDeleteModal({
      isOpen: true,
      orderId: id,
      trackingCode: trackingCode,
      isBulk: false
    });
  };

  // Open bulk delete confirmation modal
  const handleOpenBulkDelete = () => {
    setDeleteModal({
      isOpen: true,
      orderId: null,
      trackingCode: '',
      isBulk: true
    });
  };

  // Confirm and execute hard delete
  const handleConfirmDelete = async () => {
    try {
      const idsToDelete = deleteModal.isBulk ? selectedOrderIds : [deleteModal.orderId];
      
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      // Update UI state locally
      setOrders(prev => prev.filter(o => !idsToDelete.includes(o.id)));
      setSelectedOrderIds(prev => prev.filter(id => !idsToDelete.includes(id)));
      
      // Close modal
      setDeleteModal({ isOpen: false, orderId: null, trackingCode: '', isBulk: false });
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus pesanan: ' + err.message);
    }
  };

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

  const filteredProducts = selectedCategoryId
    ? productsList.filter(p => p.category_id === selectedCategoryId)
    : productsList;

  return (
    <div className="space-y-6 relative pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Manajemen Pesanan</h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">Kelola dan proses pesanan yang masuk dari pelanggan.</p>
        </div>
        <button
          onClick={() => setIsManualModalOpen(true)}
          className="bg-yellow-600 hover:bg-yellow-700 text-white dark:bg-yellow-550 dark:hover:bg-yellow-600 dark:text-hitam font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
        >
          <span>➕</span> Tambah Pesanan Manual
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 border-b border-gray-200 dark:border-zinc-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              // Reset selection when changing tabs for better UX
              setSelectedOrderIds([]);
            }}
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

      {/* Bulk Action Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl p-4 flex items-center justify-between gap-4 animate-fade-in">
          <span className="text-sm font-semibold">
            {selectedOrderIds.length} pesanan terpilih
          </span>
          <button
            onClick={handleOpenBulkDelete}
            className="bg-red-650 hover:bg-red-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Trash2 size={14} /> Hapus Terpilih
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-zinc-400">
            <thead className="bg-gray-50 dark:bg-zinc-950/50 text-xs uppercase text-gray-500 dark:text-zinc-500 font-medium">
              <tr>
                {showSelectColumn && (
                  <th className="px-6 py-4 w-12 text-center">
                    {selectableOrdersInTab.length > 0 && (
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 dark:border-zinc-800 text-yellow-600 focus:ring-yellow-500 cursor-pointer"
                      />
                    )}
                  </th>
                )}
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
                  <td colSpan={showSelectColumn ? 7 : 6} className="px-6 py-12 text-center text-gray-500 dark:text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                      Memuat data pesanan...
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={showSelectColumn ? 7 : 6} className="px-6 py-16 text-center text-gray-500 dark:text-zinc-500">
                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Tidak ada pesanan di kategori ini.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                    {showSelectColumn && (
                      <td className="px-6 py-4 text-center">
                        {isSelectable(order) ? (
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={() => handleSelectRow(order.id)}
                            className="rounded border-gray-300 dark:border-zinc-800 text-yellow-600 focus:ring-yellow-500 cursor-pointer"
                          />
                        ) : (
                          <div className="w-4 h-4 mx-auto rounded border border-gray-200 dark:border-zinc-800 opacity-20 bg-gray-50 dark:bg-zinc-950 cursor-not-allowed"></div>
                        )}
                      </td>
                    )}
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
                      <div className="flex justify-end gap-2">
                        <Link 
                          to={`/orders/${order.id}`}
                          className="inline-flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium"
                        >
                          <Eye size={14} /> Detail
                        </Link>
                        {isSelectable(order) && (
                          <button
                            onClick={() => handleOpenDelete(order.id, order.tracking_code)}
                            className="inline-flex items-center justify-center p-1.5 text-gray-450 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-550 bg-gray-100 dark:bg-zinc-800/50 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg transition-colors text-xs font-medium"
                            title="Hapus Pesanan"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* Custom Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-2xl animate-zoom-in">
            <div className="flex items-center gap-4 text-red-500 mb-4">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Konfirmasi Hapus Pesanan
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-zinc-300 mb-6">
              {deleteModal.isBulk 
                ? `Apakah Anda yakin ingin menghapus ${selectedOrderIds.length} pesanan terpilih dari sistem?`
                : `Apakah Anda yakin ingin menghapus data pesanan ${deleteModal.trackingCode} dari sistem?`
              }
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ isOpen: false, orderId: null, trackingCode: '', isBulk: false })}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tambah Pesanan Manual Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-zoom-in my-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-150 dark:border-zinc-800">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>➕</span> Tambah Pesanan Manual
                </h3>
                <p className="text-xs text-gray-500 mt-1">Buat data pesanan untuk transaksi di luar website.</p>
              </div>
              <button 
                onClick={() => { resetManualForm(); setIsManualModalOpen(false); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 text-lg font-bold p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualOrderSubmit} className="space-y-5">
              
              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status Pesanan *</label>
                <select
                  value={manualOrder.status}
                  onChange={(e) => setManualOrder(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600 transition-all"
                >
                  <option value="processing">Diproses</option>
                  <option value="delivered">Selesai</option>
                </select>
                {productModal.errors?.productId && <p className="text-red-500 text-xs mt-1">{productModal.errors.productId}</p>}
                  </div>

              {/* Grid 1: Info Pelanggan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Pelanggan *</label>
                  <input
                    type="text"
                    value={manualOrder.name}
                    onChange={(e) => setManualOrder(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: Budi Santoso"
                    className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:bg-white dark:focus:bg-zinc-950 transition-all ${
                      manualOrderErrors.name ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20'
                    }`}
                  />
                  {manualOrderErrors.name && <p className="text-red-500 text-xs mt-1">{manualOrderErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nomor Telepon *</label>
                  <div className="flex gap-2">
                    <select
                      value={manualOrder.phoneCode}
                      onChange={(e) => setManualOrder(prev => ({ ...prev, phoneCode: e.target.value }))}
                      className="px-2 py-2.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm font-semibold focus:outline-none focus:border-yellow-600 transition-all shrink-0 cursor-pointer"
                    >
                      {countryCodesList.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={manualOrder.phoneLocal}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                        setManualOrder(prev => ({ ...prev, phoneLocal: val }));
                      }}
                      placeholder="8xxxxxxxxxx"
                      className={`w-full min-w-0 px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:bg-white dark:focus:bg-zinc-950 transition-all ${
                        manualOrderErrors.phone ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20'
                      }`}
                    />
                  </div>
                  {manualOrderErrors.phone && <p className="text-red-500 text-xs mt-1">{manualOrderErrors.phone}</p>}
                </div>
              </div>



              <div className="w-full h-px bg-gray-150 dark:border-zinc-800 my-4" />

              {/* Produk & Harga Negosiasi */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Daftar Produk *</h4>
                  <button type="button" onClick={() => handleOpenProductModal(-1)} className="text-xs font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 px-3 py-1.5 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-500/20 transition-colors flex items-center gap-1">
                    <span>➕</span> Tambah Produk
                  </button>
                </div>
                
                <div className={`bg-gray-50 dark:bg-zinc-950 border ${manualOrderErrors.items ? 'border-red-300 dark:border-red-500/50' : 'border-gray-150 dark:border-zinc-850'} rounded-2xl overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500 dark:text-zinc-400">
                      <thead className="bg-gray-100/50 dark:bg-zinc-900/50 text-[10px] uppercase text-gray-400 dark:text-zinc-500 font-bold border-b border-gray-150 dark:border-zinc-850">
                        <tr>
                          <th className="px-4 py-3 min-w-[200px]">Produk</th>
                          <th className="px-4 py-3 w-32">Kuantitas</th>
                          <th className="px-4 py-3 w-40 text-right">Harga Satuan</th>
                          <th className="px-4 py-3 w-40 text-right">Subtotal</th>
                          <th className="px-4 py-3 w-12 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 dark:divide-zinc-850">
                        {manualOrder.items.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-gray-400 dark:text-zinc-500 italic text-xs">
                              Belum ada produk ditambahkan
                            </td>
                          </tr>
                        ) : manualOrder.items.map((item, index) => {
                          const product = productsList.find(p => p.id === item.productId);
                          const unitPrice = item.isCustom ? (parseFloat(item.customPrice) || 0) : (product ? product.price : 0);
                          const subtotal = (parseInt(item.quantity) || 0) * unitPrice;
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                              <td className="px-4 py-3 align-middle text-gray-900 dark:text-zinc-100 font-medium">
                                {item.isCustom ? (
                                  <div>
                                    <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-500 text-[9px] px-1.5 py-0.5 rounded-md mr-2 font-bold uppercase">Kustom</span>
                                    {item.customName}
                                  </div>
                                ) : (
                                  product ? product.name : 'Produk tidak ditemukan'
                                )}
                              </td>
                              
                              <td className="px-4 py-3 align-middle text-center text-gray-900 dark:text-zinc-100 font-medium">
                                {item.quantity}
                              </td>
                              
                              <td className="px-4 py-3 align-middle text-right text-gray-900 dark:text-zinc-100 font-medium">
                                Rp {Number(unitPrice).toLocaleString('id-ID')}
                              </td>
                              
                              <td className="px-4 py-3 align-middle text-right">
                                <div className="text-yellow-600 dark:text-yellow-500 font-bold">
                                  Rp {Number(subtotal).toLocaleString('id-ID')}
                                </div>
                              </td>
                              
                              <td className="px-4 py-3 align-middle text-center whitespace-nowrap">
                                <button type="button" onClick={() => handleOpenProductModal(index)} className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors inline-block mr-1">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button type="button" onClick={() => handleRemoveItem(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors inline-block">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                {manualOrderErrors.items && <p className="text-red-500 text-xs mt-1">{manualOrderErrors.items}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Harga Negosiasi (Opsional)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={manualOrder.negotiatedPrice}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setManualOrder(prev => ({ ...prev, negotiatedPrice: val }));
                    }}
                    placeholder="Contoh: 150000"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600 focus:bg-white dark:focus:bg-zinc-950 transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Kosongkan jika menggunakan harga normal produk.</p>
                </div>
                {manualOrder.status === 'processing' && (
                  <div>
                    <div className="flex flex-wrap justify-between items-center mb-2 gap-x-2 gap-y-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Ongkos Kirim</label>
                      <div className="flex items-center gap-1.5 cursor-pointer shrink-0" onClick={() => setAutoCalculateShipping(!autoCalculateShipping)}>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Otomatis</span>
                        <button
                          type="button"
                          className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${
                            autoCalculateShipping ? 'bg-yellow-600 dark:bg-yellow-500' : 'bg-gray-300 dark:bg-zinc-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              autoCalculateShipping ? 'translate-x-[14px]' : 'translate-x-[2px]'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={autoCalculateShipping}
                      value={manualOrder.shippingCost}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setManualOrder(prev => ({ ...prev, shippingCost: val }));
                      }}
                      placeholder="0 (Opsional)"
                      className={`w-full px-4 py-2.5 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:bg-white dark:focus:bg-zinc-950 transition-all ${
                        autoCalculateShipping 
                          ? 'bg-gray-100 dark:bg-zinc-900 text-gray-400 dark:text-zinc-500 border-gray-200 dark:border-zinc-800 cursor-not-allowed' 
                          : 'bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 focus:border-yellow-600'
                      }`}
                    />
                  </div>
                )}
              </div>
              <div className="w-full h-px bg-gray-150 dark:border-zinc-800 my-4" />

              {/* Alamat Lengkap Pas Kaya Checkout (Hanya jika status Diproses) */}
              {manualOrder.status === 'processing' && (
              <div>
                <h4 className="text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider mb-3">Alamat Pengiriman (Pas Checkout)</h4>
                <div className="space-y-4 bg-gray-50/50 dark:bg-zinc-950/20 p-4 rounded-2xl border border-gray-150 dark:border-zinc-850">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Jalan / Detail Alamat *</label>
                    <textarea
                      value={manualOrder.addressDetails.street}
                      onChange={(e) => {
                        setManualOrder(prev => ({
                          ...prev,
                          addressDetails: { ...prev.addressDetails, street: e.target.value }
                        }));
                        setIsAddressSaved(false);
                      }}
                      placeholder="Nama Jalan, Blok, No. Rumah, RT/RW, Apartemen..."
                      rows={2}
                      className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none resize-none ${
                        manualOrderErrors.street ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800'
                      }`}
                    />
                    {manualOrderErrors.street && <p className="text-red-500 text-xs mt-1">{manualOrderErrors.street}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kecamatan</label>
                      <input
                        type="text"
                        value={manualOrder.addressDetails.subdistrict}
                        onChange={(e) => {
                          setManualOrder(prev => ({
                            ...prev,
                            addressDetails: { ...prev.addressDetails, subdistrict: e.target.value }
                          }));
                          setIsAddressSaved(false);
                        }}
                        placeholder="Kecamatan"
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kota / Kabupaten *</label>
                      <input
                        type="text"
                        value={manualOrder.addressDetails.city}
                        onChange={(e) => {
                          setManualOrder(prev => ({
                            ...prev,
                            addressDetails: { ...prev.addressDetails, city: e.target.value }
                          }));
                          setIsAddressSaved(false);
                        }}
                        placeholder="Kota / Kabupaten"
                        className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none ${
                          manualOrderErrors.city ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800'
                        }`}
                      />
                      {manualOrderErrors.city && <p className="text-red-500 text-xs mt-1">{manualOrderErrors.city}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Provinsi *</label>
                      <input
                        type="text"
                        value={manualOrder.addressDetails.province}
                        onChange={(e) => {
                          setManualOrder(prev => ({
                            ...prev,
                            addressDetails: { ...prev.addressDetails, province: e.target.value }
                          }));
                          setIsAddressSaved(false);
                        }}
                        placeholder="Provinsi"
                        className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none ${
                          manualOrderErrors.province ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800'
                        }`}
                      />
                      {manualOrderErrors.province && <p className="text-red-500 text-xs mt-1">{manualOrderErrors.province}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kode Pos</label>
                      <input
                        type="text"
                        value={manualOrder.addressDetails.postalCode}
                        onChange={(e) => {
                          setManualOrder(prev => ({
                            ...prev,
                            addressDetails: { ...prev.addressDetails, postalCode: e.target.value }
                          }));
                          setIsAddressSaved(false);
                        }}
                        placeholder="Kode Pos"
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Negara *</label>
                    <input
                      type="text"
                      value={manualOrder.addressDetails.country}
                      onChange={(e) => {
                        setManualOrder(prev => ({
                          ...prev,
                          addressDetails: { ...prev.addressDetails, country: e.target.value }
                        }));
                        setIsAddressSaved(false);
                      }}
                      placeholder="Negara"
                      className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none ${
                        manualOrderErrors.country ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800'
                      }`}
                    />
                    {manualOrderErrors.country && <p className="text-red-500 text-xs mt-1">{manualOrderErrors.country}</p>}
                  </div>
                  
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      className={`w-full md:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        isAddressSaved
                          ? 'bg-green-500 hover:bg-green-600 text-white dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/30'
                          : 'bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-zinc-700 dark:hover:bg-zinc-600'
                      }`}
                    >
                      {isAddressSaved ? '✓ Alamat Tersimpan' : 'Simpan Alamat'}
                    </button>
                    {!isAddressSaved && (
                      <p className="text-[10px] text-gray-400 mt-1.5 ml-1">Simpan alamat untuk memunculkan tarif ongkir otomatis.</p>
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* Catatan Pesanan */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Catatan Pesanan (Pesan Pembeli)</label>
                <textarea
                  value={manualOrder.notes}
                  onChange={(e) => setManualOrder(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Warna cadangan, request kemasan kado, dll (opsional)..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20 transition-all resize-none"
                />
              </div>

              
              {/* Mata Uang Selection */}
              <div className="mt-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mata Uang *</label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600 transition-all"
                  >
                    <option value="IDR">IDR (Rupiah)</option>
                    <option value="MYR">MYR (Ringgit)</option>
                    <option value="SGD">SGD (Sing. Dollar)</option>
                    <option value="BND">BND (Brunei Dollar)</option>
                    <option value="THB">THB (Baht)</option>
                    <option value="PHP">PHP (Peso)</option>
                    <option value="JPY">JPY (Yen)</option>
                    <option value="CNY">CNY (Yuan)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>
              </div>

              {/* Total Summary */}

              <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-5 rounded-2xl mt-6 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-150 dark:border-zinc-800 pb-3 mb-3">Rincian Pembayaran</h4>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-zinc-400">Subtotal Produk ({manualOrder.items.length} item)</span>
                  <span className="font-medium text-gray-900 dark:text-zinc-200">
                    Rp {Number(
                      manualOrder.items.reduce((sum, item) => {
                        const product = productsList.find(p => p.id === item.productId);
                        const price = item.isCustom ? (parseFloat(item.customPrice) || 0) : (product ? product.price : 0);
                        return sum + (parseInt(item.quantity) || 0) * price;
                      }, 0)
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
                
                {manualOrder.status === 'processing' && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-zinc-400">Ongkos Kirim</span>
                    <span className="font-medium text-gray-900 dark:text-zinc-200">
                      + Rp {Number(parseFloat(manualOrder.shippingCost) || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}

                {parseFloat(manualOrder.negotiatedPrice) >= 0 && (
                  <div className="flex justify-between items-center text-sm text-yellow-600 dark:text-yellow-500">
                    <span className="font-medium">Potongan Negosiasi</span>
                    <span className="font-bold">
                      - Rp {Number(
                        manualOrder.items.reduce((sum, item) => {
                          const product = productsList.find(p => p.id === item.productId);
                          const price = item.isCustom ? (parseFloat(item.customPrice) || 0) : (product ? product.price : 0);
                          return sum + (parseInt(item.quantity) || 0) * price;
                        }, 0) - parseFloat(manualOrder.negotiatedPrice)
                      ).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                
                <div className="pt-3 mt-3 border-t border-gray-150 dark:border-zinc-800 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900 dark:text-white uppercase">Total Keseluruhan</span>
                  
                  <span className="text-xl font-black text-yellow-600 dark:text-yellow-500">
                    Rp {Number(
                      (parseFloat(manualOrder.negotiatedPrice) >= 0 
                        ? parseFloat(manualOrder.negotiatedPrice) 
                        : manualOrder.items.reduce((sum, item) => {
                            const product = productsList.find(p => p.id === item.productId);
                            const price = item.isCustom ? (parseFloat(item.customPrice) || 0) : (product ? product.price : 0);
                            return sum + (parseInt(item.quantity) || 0) * price;
                          }, 0)
                      ) + (manualOrder.status === 'processing' ? (parseFloat(manualOrder.shippingCost) || 0) : 0)
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
                
                {selectedCurrency !== 'IDR' && (
                  <div className="pt-3 mt-3 border-t border-dashed border-gray-200 dark:border-zinc-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase">Nilai Konversi ({selectedCurrency})</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedCurrency} {Number(
                        (
                          (parseFloat(manualOrder.negotiatedPrice) >= 0 
                            ? parseFloat(manualOrder.negotiatedPrice) 
                            : manualOrder.items.reduce((sum, item) => {
                                const product = productsList.find(p => p.id === item.productId);
                                const price = item.isCustom ? (parseFloat(item.customPrice) || 0) : (product ? product.price : 0);
                                return sum + (parseInt(item.quantity) || 0) * price;
                              }, 0)
                          ) + (manualOrder.status === 'processing' ? (parseFloat(manualOrder.shippingCost) || 0) : 0)
                        ) * (exchangeRates[selectedCurrency] || 1)
                      ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
  

              {/* Modal Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-150 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => { resetManualForm(); setIsManualModalOpen(false); }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={manualOrderLoading}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-yellow-600 hover:bg-yellow-700 text-white dark:bg-yellow-550 dark:hover:bg-yellow-600 dark:text-hitam transition-all shadow-sm disabled:opacity-50"
                >
                  {manualOrderLoading ? 'Memproses...' : 'Buat Pesanan'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      
      {/* Product Add/Edit Modal */}
      {productModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-2xl animate-zoom-in relative">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-150 dark:border-zinc-800 pb-3">
              {productModal.editIndex >= 0 ? 'Edit Produk' : 'Tambah Produk'}
            </h3>
            
            <div className="space-y-4">
              <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setProductModal(prev => ({ ...prev, item: { ...prev.item, isCustom: false, customName: '', customPrice: '' } }))}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${!productModal.item.isCustom ? 'bg-white dark:bg-zinc-900 text-yellow-600 dark:text-yellow-500 shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'}`}
                >
                  Dari Katalog
                </button>
                <button
                  type="button"
                  onClick={() => setProductModal(prev => ({ ...prev, item: { ...prev.item, isCustom: true, productId: '' } }))}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${productModal.item.isCustom ? 'bg-white dark:bg-zinc-900 text-yellow-600 dark:text-yellow-500 shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'}`}
                >
                  Input Manual
                </button>
              </div>

              {!productModal.item.isCustom ? (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input 
                        type="text" 
                        placeholder="Cari produk..." 
                        value={modalSearchQuery}
                        onChange={(e) => setModalSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-yellow-600"
                      />
                    </div>
                    <div className="flex-1">
                      <select 
                        value={modalCategoryId}
                        onChange={(e) => setModalCategoryId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-yellow-600"
                      >
                        <option value="">Semua Kategori</option>
                        {categoriesList.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Produk *</label>
                    <select
                      value={productModal.item.productId}
                      onChange={(e) => setProductModal(prev => ({ ...prev, item: { ...prev.item, productId: e.target.value } }))}
                      className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600 ${productModal.errors?.productId ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800'}`}
                    >
                      <option value="">-- Pilih Produk --</option>
                      {productsList
                        .filter(p => (!modalCategoryId || p.category_id === modalCategoryId) && (!modalSearchQuery || p.name.toLowerCase().includes(modalSearchQuery.toLowerCase())))
                        .map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>
                      ))}
                    </select>
                    {productModal.errors?.productId && <p className="text-red-500 text-xs mt-1">{productModal.errors.productId}</p>}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Produk Kustom *</label>
                    <input
                      type="text"
                      value={productModal.item.customName}
                      onChange={(e) => setProductModal(prev => ({ ...prev, item: { ...prev.item, customName: e.target.value } }))}
                      placeholder="Contoh: BHS Eceran"
                      className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600 ${productModal.errors?.customName ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800'}`}
                    />
                    {productModal.errors?.customName && <p className="text-red-500 text-xs mt-1">{productModal.errors.customName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Harga Satuan *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-gray-400 text-sm">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={productModal.item.customPrice}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setProductModal(prev => ({ ...prev, item: { ...prev.item, customPrice: val } }));
                        }}
                        className={`w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600 ${productModal.errors?.customPrice ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800'}`}
                      />
                    </div>
                    {productModal.errors?.customPrice && <p className="text-red-500 text-xs mt-1">{productModal.errors.customPrice}</p>}
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kuantitas *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={productModal.item.quantity}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
                    setProductModal(prev => ({ ...prev, item: { ...prev.item, quantity: val } }));
                  }}
                  placeholder="Contoh: 1"
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600 ${productModal.errors?.quantity ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800'}`}
                />
                {productModal.errors?.quantity && <p className="text-red-500 text-xs mt-1">{productModal.errors.quantity}</p>}
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-150 dark:border-zinc-800 justify-end">
              <button
                type="button"
                onClick={() => setProductModal({ isOpen: false, editIndex: -1, item: { productId: '', quantity: '', isCustom: false, customName: '', customPrice: '' } })}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveProductModal}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-yellow-600 hover:bg-yellow-700 text-white dark:bg-yellow-550 dark:hover:bg-yellow-600 dark:text-hitam transition-all"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 p-8 max-w-sm w-full shadow-2xl animate-zoom-in text-center">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Pesanan Berhasil Dibuat!</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
              Pesanan manual telah tersimpan. Berikut adalah ID Pesanannya:
            </p>
            
            <div className="bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4 rounded-xl flex items-center justify-between gap-3 mb-6">
              <span className="font-mono text-sm font-bold text-gray-900 dark:text-zinc-100 select-all">
                {successModal.trackingCode}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(successModal.trackingCode);
                  alert('ID Pesanan disalin ke clipboard!');
                }}
                className="text-xs font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-600/10 dark:bg-yellow-500/10 hover:bg-yellow-600/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                Salin
              </button>
            </div>

            <button
              onClick={() => setSuccessModal({ isOpen: false, trackingCode: '' })}
              className="w-full px-5 py-3 rounded-xl text-sm font-bold bg-yellow-600 hover:bg-yellow-700 text-white dark:bg-yellow-550 dark:hover:bg-yellow-600 dark:text-hitam transition-all shadow-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
