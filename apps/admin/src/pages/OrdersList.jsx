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

  // Manual Order states
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('IDR');
  const [useOriginalPrice, setUseOriginalPrice] = useState(true);
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
    productId: '',
    quantity: 1,
    unitPrice: 0,
    shippingCost: 0,
    status: 'processing'
  });
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

  // Sync default phone country with selected currency
  useEffect(() => {
    if (selectedCurrency) {
      const currencyToCountryCode = {
        IDR: '+62',
        MYR: '+60',
        SGD: '+65',
        BND: '+673',
        THB: '+66',
        PHP: '+63',
        JPY: '+81',
        CNY: '+86',
        EUR: '+49',
        USD: '+1'
      };
      const targetCode = currencyToCountryCode[selectedCurrency];
      if (targetCode) {
        const matched = countryCodesList.find(c => c.code === targetCode);
        if (matched) {
          setManualOrder(prev => ({
            ...prev,
            phoneCode: matched.code
          }));
        }
      }
    }
  }, [selectedCurrency]);

  // Sync unit price when using original price
  useEffect(() => {
    if (useOriginalPrice && manualOrder.productId) {
      const selectedProd = productsList.find(p => p.id === manualOrder.productId);
      if (selectedProd) {
        setManualOrder(prev => ({ ...prev, unitPrice: String(selectedProd.price) }));
      }
    }
    if (!useOriginalPrice && !manualOrder.productId) {
      setManualOrder(prev => ({ ...prev, unitPrice: '' }));
    }
  }, [useOriginalPrice, manualOrder.productId, productsList]);

  // Calculate shipping cost automatically (only when address is saved)
  const calculateManualShipping = (provinceName, prodId) => {
    if (!autoCalculateShipping) return;

    const selectedProd = productsList.find(p => p.id === prodId);
    if (selectedProd && selectedProd.free_shipping !== false) {
      setManualOrder(prev => ({ ...prev, shippingCost: 0 }));
      return;
    }

    if (!provinceName?.trim()) {
      setManualOrder(prev => ({ ...prev, shippingCost: 0 }));
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

    const cost = isDomestic ? 15000 : 150000;
    setManualOrder(prev => ({ ...prev, shippingCost: String(cost) }));
  };

  const handleSaveAddress = () => {
    if (!manualOrder.addressDetails.province.trim() || !manualOrder.addressDetails.city.trim() || !manualOrder.addressDetails.street.trim()) {
      alert("Mohon lengkapi Jalan, Kota, dan Provinsi terlebih dahulu.");
      return;
    }
    setIsAddressSaved(true);
    if (autoCalculateShipping) {
      calculateManualShipping(manualOrder.addressDetails.province, manualOrder.productId);
    }
  };

  // Recalculate shipping if product changes and address is already saved
  useEffect(() => {
    if (isAddressSaved && autoCalculateShipping) {
      calculateManualShipping(manualOrder.addressDetails.province, manualOrder.productId);
    }
  }, [manualOrder.productId, autoCalculateShipping, isAddressSaved, productsList]);

  const resetManualForm = () => {
    setManualOrder({
      name: '',
      phoneCode: '+62',
      phoneLocal: '',
      addressDetails: { street: '', subdistrict: '', city: '', province: '', postalCode: '', country: 'Indonesia' },
      notes: '',
      productId: '',
      quantity: 1,
      unitPrice: '',
      shippingCost: '',
      status: 'processing'
    });
    setSelectedCategoryId('');
    setSelectedCurrency('IDR');
    setUseOriginalPrice(true);
    setAutoCalculateShipping(true);
    setIsAddressSaved(false);
    setManualOrderErrors({});
  };

  const handleProductChange = (prodId) => {
    const selectedProd = productsList.find(p => p.id === prodId);
    setManualOrder(prev => ({
      ...prev,
      productId: prodId,
      unitPrice: (useOriginalPrice && selectedProd) ? String(selectedProd.price) : prev.unitPrice,
      quantity: 1
    }));
  };

  const handleManualOrderSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!manualOrder.name.trim()) errors.name = 'Nama penerima wajib diisi';
    if (!manualOrder.phoneLocal.trim()) errors.phone = 'Nomor telepon wajib diisi';
    
    // Validate address details
    if (!manualOrder.addressDetails.street.trim()) errors.street = 'Jalan / Detail alamat wajib diisi';
    if (!manualOrder.addressDetails.city.trim()) errors.city = 'Kota / Kabupaten wajib diisi';
    if (!manualOrder.addressDetails.province.trim()) errors.province = 'Provinsi wajib diisi';
    if (!manualOrder.addressDetails.country.trim()) errors.country = 'Negara wajib diisi';

    if (!manualOrder.productId) errors.productId = 'Pilih produk terlebih dahulu';
    if (manualOrder.quantity <= 0) errors.quantity = 'Kuantitas minimal 1';
    
    if (manualOrder.productId) {
      const selectedProd = productsList.find(p => p.id === manualOrder.productId);
      if (selectedProd && selectedProd.stock < manualOrder.quantity) {
        errors.quantity = `Stok tidak mencukupi (Tersedia: ${selectedProd.stock})`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setManualOrderErrors(errors);
      return;
    }

    setManualOrderErrors({});
    setManualOrderLoading(true);

    try {
      const fullPhone = `${manualOrder.phoneCode} ${manualOrder.phoneLocal.trim()}`;
      
      // Format address exactly like Checkout.jsx
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

      const { data: orderData, error: rpcError } = await supabase.rpc('create_guest_order', {
        p_name: manualOrder.name.trim(),
        p_phone: fullPhone,
        p_email: '',
        p_address: fullAddress,
        p_product_id: manualOrder.productId,
        p_quantity: parseInt(manualOrder.quantity) || 1,
        p_unit_price: parseFloat(manualOrder.unitPrice) || 0,
        p_shipping_cost: parseFloat(manualOrder.shippingCost) || 0,
        p_promo_qty: 0,
        p_promo_price: 0,
        p_normal_qty: parseInt(manualOrder.quantity) || 1,
        p_normal_price: parseFloat(manualOrder.unitPrice) || 0
      });

      if (rpcError) throw rpcError;

      const orderId = orderData.order_id;
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ status: manualOrder.status })
        .eq('id', orderId)
        .select('tracking_code')
        .single();

      if (updateError) throw updateError;

      resetManualForm();
      setIsManualModalOpen(false);
      setSuccessModal({ isOpen: true, trackingCode: updatedOrder.tracking_code });
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Gagal membuat pesanan: ' + err.message);
    } finally {
      setManualOrderLoading(false);
    }
  };

  useEffect(() => {

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

  // Confirm and execute soft delete
  const handleConfirmDelete = async () => {
    try {
      const idsToDelete = deleteModal.isBulk ? selectedOrderIds : [deleteModal.orderId];
      
      const { error } = await supabase
        .from('orders')
        .update({ is_deleted: true })
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
              
              {/* Grid 1: Pelanggan, Mata Uang, Telepon */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Penerima / Pelanggan *</label>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mata Uang *</label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600"
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

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nomor Telepon *</label>
                  <div className="flex gap-2">
                    <div className="px-3 py-2.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm font-semibold flex items-center gap-1.5 select-none shrink-0">
                      <span>{countryCodesList.find(c => c.code === manualOrder.phoneCode)?.flag || '🌐'}</span>
                      <span>{manualOrder.phoneCode}</span>
                    </div>
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

              {/* Alamat Lengkap Pas Kaya Checkout */}
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

              <div className="w-full h-px bg-gray-150 dark:border-zinc-800 my-4" />

              {/* Grid 2: Kategori & Produk & Jumlah */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filter Kategori</label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600"
                  >
                    <option value="">Semua Kategori</option>
                    {categoriesList.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Produk *</label>
                  <select
                    value={manualOrder.productId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none ${
                      manualOrderErrors.productId ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20'
                    }`}
                  >
                    <option value="">-- Pilih Produk --</option>
                    {filteredProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stok: {p.stock} | Rp {Number(p.price).toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                  {manualOrderErrors.productId && <p className="text-red-500 text-xs mt-1">{manualOrderErrors.productId}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kuantitas *</label>
                  <input
                    type="number"
                    min="1"
                    value={manualOrder.quantity}
                    onChange={(e) => setManualOrder(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:bg-white dark:focus:bg-zinc-950 transition-all ${
                      manualOrderErrors.quantity ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600/20'
                    }`}
                  />
                  {manualOrderErrors.quantity && <p className="text-red-500 text-xs mt-1">{manualOrderErrors.quantity}</p>}
                </div>
              </div>

              {/* Grid 3: Harga Satuan, Ongkos Kirim, Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Harga Satuan (Rp) *</label>
                    <button
                      type="button"
                      onClick={() => setUseOriginalPrice(!useOriginalPrice)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all border ${
                        useOriginalPrice 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : 'bg-zinc-550/10 text-zinc-400 border-zinc-500/20'
                      }`}
                    >
                      {useOriginalPrice ? 'Harga Asli: ON' : 'Harga Asli: OFF'}
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={useOriginalPrice}
                    value={manualOrder.unitPrice}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setManualOrder(prev => ({ ...prev, unitPrice: val }));
                    }}
                    placeholder="0"
                    className={`w-full px-4 py-2.5 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:bg-white dark:focus:bg-zinc-950 transition-all ${
                      useOriginalPrice 
                        ? 'bg-gray-100 dark:bg-zinc-900 text-gray-400 dark:text-zinc-500 border-gray-200 dark:border-zinc-800 cursor-not-allowed' 
                        : 'bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 focus:border-yellow-600'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Ongkos Kirim (Rp)</label>
                    <button
                      type="button"
                      onClick={() => setAutoCalculateShipping(!autoCalculateShipping)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all border ${
                        autoCalculateShipping 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : 'bg-zinc-550/10 text-zinc-400 border-zinc-500/20'
                      }`}
                    >
                      {autoCalculateShipping ? 'Otomatis: ON' : 'Otomatis: OFF'}
                    </button>
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

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status Pesanan *</label>
                  <select
                    value={manualOrder.status}
                    onChange={(e) => setManualOrder(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none"
                  >
                    <option value="processing">Diproses</option>
                    <option value="delivered">Selesai</option>
                  </select>
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-yellow-600/5 dark:bg-yellow-500/5 border border-yellow-600/10 dark:border-yellow-500/10 p-4 rounded-2xl flex justify-between items-center text-sm font-semibold mt-6">
                <span className="text-gray-600 dark:text-zinc-400">Total Harga Pesanan:</span>
                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-500">
                  Rp {Number((parseInt(manualOrder.quantity) || 0) * (parseFloat(manualOrder.unitPrice) || 0) + (parseFloat(manualOrder.shippingCost) || 0)).toLocaleString('id-ID')}
                </span>
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
