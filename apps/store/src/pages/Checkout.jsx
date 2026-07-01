import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Store, ChevronLeft, MapPin, Loader2, X, Check, Copy, ChevronDown, Search } from 'lucide-react';

const countryCodesList = [
  { name: 'Indonesia', code: '+62', flag: '🇮🇩' },
  { name: 'Malaysia', code: '+60', flag: '🇲🇾' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'Brunei', code: '+673', flag: '🇧🇳' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
];
import { MapContainer, TileLayer, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Helper component: moves map view when coords change
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { animate: true, duration: 1.2 }); // Slightly lower zoom for radius view
      // Invalidate size to prevent gray boxes inside modal
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  }, [center, map]);
  return null;
}

// Map Click Handler to reposition radius center
function MapClickHandler({ setCoords }) {
  useMapEvents({
    click(e) {
      setCoords([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { product, quantity } = location.state || {};

  // Hitung split pricing jika ada promo aktif dan kuantitas melebihi promo stock
  const isPromoActive = !!product?.promo_type;
  const promoStockAvailable = isPromoActive ? (product?.stock || 0) : 0;
  
  const promoQty = isPromoActive ? Math.min(quantity, promoStockAvailable) : 0;
  const normalQty = isPromoActive ? Math.max(0, quantity - promoStockAvailable) : quantity;
  
  const promoPrice = product?.price || 0;
  const normalPrice = isPromoActive ? (product?.regular_price || product?.price || 0) : (product?.price || 0);

  const promoSubtotal = promoQty * promoPrice;
  const normalSubtotal = normalQty * normalPrice;
  const totalSubtotal = promoSubtotal + normalSubtotal;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [copied, setCopied] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState(countryCodesList[0]);
  const [localPhone, setLocalPhone] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Sync combined phone number to formData.phone
  useEffect(() => {
    if (localPhone) {
      setFormData(prev => ({ ...prev, phone: `${selectedCountry.code} ${localPhone}` }));
    } else {
      setFormData(prev => ({ ...prev, phone: '' }));
    }
  }, [selectedCountry, localPhone]);

  // Click outside listener for country code dropdown
  useEffect(() => {
    if (!showDropdown) return;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDropdown]);

  const filteredCountries = countryCodesList.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.includes(searchTerm)
  );

  // Structured address state (in modal)
  const [addressDetails, setAddressDetails] = useState({
    street: '',
    subdistrict: '', // Kecamatan
    city: '',        // Kota/Kabupaten
    province: '',    // Provinsi
    postalCode: '',  // Kode Pos
    country: 'Indonesia'
  });
  
  // Shipping cost states
  const [shippingRates, setShippingRates] = useState([]);
  const [shippingCost, setShippingCost] = useState(0);

  useEffect(() => {
    async function fetchShippingRates() {
      try {
        const { data, error } = await supabase
          .from('shipping_rates')
          .select('*');
        if (data && !error) {
          setShippingRates(data);
        }
      } catch (err) {
        console.error('Error fetching shipping rates:', err);
      }
    }
    fetchShippingRates();
  }, []);

  // Scroll to top when order success screen is shown
  useEffect(() => {
    if (success) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [success]);

  const calculateShipping = (provinceName) => {
    if (product?.free_shipping === true) {
      setShippingCost(0);
      return;
    }
    if (!provinceName) {
      setShippingCost(0);
      return;
    }
    const matchedRate = shippingRates.find(r => 
      r.province.toLowerCase().trim() === provinceName.toLowerCase().trim()
    );
    if (matchedRate) {
      setShippingCost(Number(matchedRate.cost));
    } else {
      setShippingCost(20000); // Fallback rate
    }
  };
  
  // Temporary addressDetails for editing in modal
  const [tempAddress, setTempAddress] = useState({
    street: '',
    subdistrict: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Indonesia'
  });

  const [addressErrors, setAddressErrors] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mapCoords, setMapCoords] = useState([-6.2088, 106.8456]); // Default: Jakarta
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const geocodeTimerRef = useRef(null);

  if (!product) return <Navigate to="/" replace />;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setTempAddress(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto geocode as the user fills the form (debounced)
      setGeocodeError('');
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
      
      // Do not trigger geocoding when only editing the street field
      if (name === 'street') {
        return updated;
      }
      
      // Build address query (excluding exact street details for privacy/reliability)
      const queryParts = [];
      if (updated.subdistrict) queryParts.push(updated.subdistrict);
      if (updated.city) queryParts.push(updated.city);
      if (updated.province) queryParts.push(updated.province);
      if (updated.country) queryParts.push(updated.country);
      
      const fullQuery = queryParts.join(', ');
      
      if (fullQuery.trim().length > 6) {
        geocodeTimerRef.current = setTimeout(() => geocodeAddress(fullQuery), 1200);
      }
      
      return updated;
    });
  };

  const geocodeAddress = async (queryAddress) => {
    setGeocoding(true);
    setGeocodeError('');
    try {
      const query = encodeURIComponent(queryAddress);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'id' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setMapCoords([parseFloat(lat), parseFloat(lon)]);
      } else {
        setGeocodeError('Area tidak ditemukan otomatis. Anda bisa klik di peta untuk menentukan area pengiriman.');
      }
    } catch {
      setGeocodeError('Gagal memuat peta otomatis.');
    } finally {
      setGeocoding(false);
    }
  };

  const openAddressModal = () => {
    setTempAddress({ ...addressDetails });
    setAddressErrors({});
    setIsModalOpen(true);
  };

  const saveAddressModal = (e) => {
    e.preventDefault();
    
    // Check validation of structured address
    const errors = {};
    if (!tempAddress.street.trim()) {
      errors.street = 'Detail alamat/jalan wajib diisi.';
    }
    if (!tempAddress.city.trim()) {
      errors.city = 'Kota/kabupaten wajib diisi.';
    }
    if (!tempAddress.province.trim()) {
      errors.province = 'Provinsi wajib diisi.';
    }
    if (!tempAddress.country.trim()) {
      errors.country = 'Negara wajib diisi.';
    }
    
    if (Object.keys(errors).length > 0) {
      setAddressErrors(errors);
      return;
    }
    setAddressErrors({});

    // Save details
    setAddressDetails(tempAddress);
    
    // Calculate shipping cost
    calculateShipping(tempAddress.province);
    
    // Concatenate address string
    const parts = [
      tempAddress.street.trim(),
      tempAddress.subdistrict.trim() ? `Kec. ${tempAddress.subdistrict.trim()}` : '',
      tempAddress.city.trim(),
      tempAddress.province.trim(),
      tempAddress.postalCode.trim() ? `Kode Pos ${tempAddress.postalCode.trim()}` : '',
      tempAddress.country.trim()
    ].filter(Boolean);

    const formattedAddress = parts.join(', ');
    setFormData(prev => ({ ...prev, address: formattedAddress }));
    
    // Close modal
    setIsModalOpen(false);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Nama lengkap wajib diisi.';
    if (!formData.phone.trim()) errors.phone = 'Nomor telepon wajib diisi.';
    if (!formData.address.trim()) errors.address = 'Alamat lengkap wajib diisi.';
    if (Object.keys(errors).length > 0) { setValidationErrors(errors); return; }

    setValidationErrors({});
    setLoading(true);
    setError('');

    try {
      // Pass p_email as empty string
      const { data: orderData, error: rpcError } = await supabase.rpc('create_guest_order', {
        p_name: formData.name,
        p_phone: formData.phone,
        p_email: '', // Removed email field from UI
        p_address: formData.address,
        p_product_id: product.id,
        p_quantity: quantity,
        p_unit_price: product.price,
        p_shipping_cost: shippingCost,
        p_promo_qty: promoQty,
        p_promo_price: promoPrice,
        p_normal_qty: normalQty,
        p_normal_price: normalPrice
      });
      if (rpcError) throw rpcError;
      setTrackingCode(orderData.tracking_code);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Gagal memproses pesanan.');
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
          <p className="text-sm text-gray-500 mb-2 uppercase tracking-wide font-bold">Kode Pesanan Anda</p>
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="text-2xl font-mono font-bold text-emas tracking-wider select-all">
              {trackingCode || 'MEMPROSES...'}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(trackingCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-1.5 text-gray-400 hover:text-emas hover:bg-white rounded-lg border border-gray-200/60 shadow-sm hover:shadow-soft transition-all duration-200"
              title="Salin Kode Pesanan"
            >
              {copied ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-semibold px-0.5">
                  <Check size={14} /> Tersalin
                </span>
              ) : (
                <Copy size={15} />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">Simpan kode ini untuk melacak status pesanan Anda.</p>
        </div>
        <div className="flex justify-center gap-4">
          <button onClick={() => navigate('/track-order?code=' + trackingCode)} className="bg-emas text-hitam px-6 py-3 font-bold hover:bg-hitam hover:text-emas transition-colors rounded-lg shadow-sm">Lacak Pesanan</button>
          <button onClick={() => navigate('/')} className="bg-gray-100 text-gray-700 px-6 py-3 font-bold hover:bg-gray-200 transition-colors rounded-lg shadow-sm">Kembali ke Beranda</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-emas transition-colors mb-8 group">
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Kembali
        </button>

        <div className="mb-10">
          <h1 className="text-3xl font-playfair font-bold text-hitam mb-1">Checkout</h1>
          <p className="text-sm text-gray-400">Lengkapi informasi di bawah untuk menyelesaikan pesanan Anda.</p>
        </div>

        {error && <p className="text-red-500 text-sm mb-6 font-medium">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">

          {/* LEFT: Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-7">Informasi Pembeli</h3>
              <form id="guest-checkout-form" onSubmit={handleCheckout} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Lengkap *</label>
                  <input
                    type="text" name="name" value={formData.name} onChange={handleChange}
                    placeholder="Nama Anda"
                    className={`w-full px-4 py-3 bg-gray-50/80 border rounded-xl text-hitam text-sm focus:outline-none focus:bg-white transition-all placeholder:text-gray-300 ${validationErrors.name ? 'border-red-300' : 'border-gray-200 focus:border-emas focus:ring-1 focus:ring-emas/20'}`}
                  />
                  {validationErrors.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">No Telepon *</label>
                  <div className="flex gap-2 relative" ref={dropdownRef}>
                    {/* Country Code Selector */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className={`flex items-center gap-1.5 bg-gray-50/80 border rounded-xl px-3 py-3 text-hitam text-sm focus:outline-none focus:bg-white transition-all h-full ${validationErrors.phone ? 'border-red-300' : 'border-gray-200 focus:border-emas focus:ring-1 focus:ring-emas/20'}`}
                      >
                        <span className="text-base">{selectedCountry.flag}</span>
                        <span className="font-semibold text-sm">{selectedCountry.code}</span>
                        <ChevronDown size={14} className="text-gray-400" />
                      </button>
                      
                      {showDropdown && (
                        <div className="absolute left-0 mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                          <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                            <Search size={14} className="text-gray-400 shrink-0" />
                            <input
                              type="text"
                              placeholder="Cari negara..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full bg-transparent text-xs text-gray-900 outline-none"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto py-1">
                            {filteredCountries.map((c) => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                  setSelectedCountry(c);
                                  setShowDropdown(false);
                                  setSearchTerm('');
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-left text-sm text-gray-900 transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-base">{c.flag}</span>
                                  <span className="truncate max-w-[110px]">{c.name}</span>
                                </span>
                                <span className="text-gray-400 font-mono text-xs">{c.code}</span>
                              </button>
                            ))}
                            {filteredCountries.length === 0 && (
                              <div className="px-3 py-2 text-xs text-gray-400 text-center">Negara tidak ditemukan</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Local Phone Input */}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={localPhone}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, ''); // Hanya simpan angka
                          if (val.startsWith('0')) {
                            val = val.substring(1);
                          }
                          setLocalPhone(val);
                        }}
                        placeholder="8xxxxxxxxxx"
                        className={`w-full px-4 py-3 bg-gray-50/80 border rounded-xl text-hitam text-sm focus:outline-none focus:bg-white transition-all placeholder:text-gray-300 ${validationErrors.phone ? 'border-red-300' : 'border-gray-200 focus:border-emas focus:ring-1 focus:ring-emas/20'}`}
                      />
                    </div>
                  </div>
                  {validationErrors.phone && <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.phone}</p>}
                </div>
                
                {/* Alamat Pengiriman Section */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Alamat Pengiriman *</label>
                  
                  {formData.address ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 relative group">
                      <div className="flex items-start gap-2.5">
                        <MapPin size={16} className="text-emas mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-hitam">Alamat Penerima</p>
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{formData.address}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openAddressModal}
                        className="text-xs font-bold text-emas hover:text-hitam transition-colors mt-2 underline"
                      >
                        Ubah Alamat
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={openAddressModal}
                        className={`w-full py-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-emas hover:text-emas transition-all text-sm font-medium ${
                          validationErrors.address ? 'border-red-300 text-red-500 bg-red-50/30' : 'border-gray-300 text-gray-400 bg-gray-50/50'
                        }`}
                      >
                        <MapPin size={20} />
                        Isi Alamat Pengiriman
                      </button>
                      {validationErrors.address && <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.address}</p>}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT: Order Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 h-fit">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-7">Ringkasan Pesanan</h3>
            <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-gray-50">
                {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex flex-col justify-center gap-1">
                <p className="font-semibold text-hitam text-sm leading-snug">{product.name}</p>
                {isPromoActive ? (
                  <div className="space-y-1 text-xs">
                    {promoQty > 0 && (
                      <p className="text-red-500 font-medium">
                        {promoQty} × Rp {promoPrice.toLocaleString('id-ID')} (Harga Promo)
                      </p>
                    )}
                    {normalQty > 0 && (
                      <p className="text-gray-500">
                        {normalQty} × Rp {normalPrice.toLocaleString('id-ID')} (Harga Normal)
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">{quantity} × Rp {product.price.toLocaleString('id-ID')}</p>
                )}
              </div>
            </div>
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>Rp {totalSubtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Ongkos Kirim</span>
                {product.free_shipping !== false ? (
                  <span className="text-green-600 font-semibold">Gratis Ongkir</span>
                ) : shippingCost > 0 ? (
                  <span className="font-semibold text-hitam">Rp {shippingCost.toLocaleString('id-ID')}</span>
                ) : (
                  <span className="text-gray-400">Belum dihitung (isi alamat)</span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center pt-5 border-t border-gray-100 mb-7">
              <span className="font-bold text-hitam text-sm">Total</span>
              <span className="text-2xl font-bold text-hitam">Rp {(totalSubtotal + shippingCost).toLocaleString('id-ID')}</span>
            </div>
            <button
              form="guest-checkout-form"
              type="submit"
              disabled={loading}
              className="w-full bg-emas text-hitam py-4 rounded-xl font-bold text-sm hover:bg-yellow-400 hover:shadow-[0_8px_20px_rgba(212,168,73,0.3)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Lanjut Checkout →'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">Tim kami akan menghubungi Anda setelah pesanan diterima.</p>
          </div>

        </div>
      </div>

      {/* MODAL POPUP FOR ADDRESS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col transform transition-all scale-100 duration-300 border border-gray-100">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-hitam">Isi Alamat Pengiriman</h3>
                <p className="text-xs text-gray-400 mt-0.5">Lengkapi form di bawah. Peta otomatis mencari koordinat yang sesuai.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Form Fields */}
              <form onSubmit={saveAddressModal} noValidate className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Jalan / Detail Alamat *</label>
                  <textarea
                    name="street" rows={2} value={tempAddress.street} onChange={handleAddressChange}
                    placeholder="Nama Jalan, Blok, No. Rumah, RT/RW, Apartemen..."
                    className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-hitam text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-emas/20 transition-all placeholder:text-gray-300 resize-none ${
                      addressErrors.street ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-emas'
                    }`}
                  />
                  {addressErrors.street && (
                    <p className="text-[11px] text-red-500 font-medium mt-1">{addressErrors.street}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Kecamatan</label>
                    <input
                      type="text" name="subdistrict" value={tempAddress.subdistrict} onChange={handleAddressChange}
                      placeholder="Kecamatan"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-hitam text-sm focus:outline-none focus:bg-white focus:border-emas focus:ring-1 focus:ring-emas/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Kota / Kabupaten *</label>
                    <input
                      type="text" name="city" value={tempAddress.city} onChange={handleAddressChange}
                      placeholder="Kota atau Kabupaten"
                      className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-hitam text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-emas/20 transition-all ${
                        addressErrors.city ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-emas'
                      }`}
                    />
                    {addressErrors.city && (
                      <p className="text-[11px] text-red-500 font-medium mt-1">{addressErrors.city}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Provinsi *</label>
                    <input
                      type="text" name="province" value={tempAddress.province} onChange={handleAddressChange}
                      placeholder="Provinsi"
                      className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-hitam text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-emas/20 transition-all ${
                        addressErrors.province ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-emas'
                      }`}
                    />
                    {addressErrors.province && (
                      <p className="text-[11px] text-red-500 font-medium mt-1">{addressErrors.province}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Kode Pos</label>
                    <input
                      type="text" name="postalCode" value={tempAddress.postalCode} onChange={handleAddressChange}
                      placeholder="Kode Pos"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-hitam text-sm focus:outline-none focus:bg-white focus:border-emas focus:ring-1 focus:ring-emas/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Negara *</label>
                  <input
                    type="text" name="country" value={tempAddress.country} onChange={handleAddressChange}
                    placeholder="Negara"
                    className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-hitam text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-emas/20 transition-all ${
                      addressErrors.country ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-emas'
                    }`}
                  />
                  {addressErrors.country && (
                    <p className="text-[11px] text-red-500 font-medium mt-1">{addressErrors.country}</p>
                  )}
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-emas text-hitam py-2.5 rounded-xl font-bold text-sm hover:bg-yellow-400 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Check size={16} /> Simpan Alamat
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </form>

              {/* Map Section inside Modal */}
              <div className="flex flex-col border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50">
                <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-emas" />
                    <span>Titik Lokasi Pengiriman</span>
                  </div>
                  {geocoding && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Loader2 size={11} className="animate-spin" />
                      Mencari lokasi...
                    </div>
                  )}
                </div>

                {geocodeError && (
                  <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100">
                    <p className="text-[10px] text-amber-600 font-medium">⚠️ {geocodeError}</p>
                  </div>
                )}

                <div className="flex-1 min-h-[220px] md:min-h-0 relative">
                  <MapContainer
                    center={mapCoords}
                    zoom={13}
                    style={{ height: '100%', width: '100%', minHeight: '260px' }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapUpdater center={mapCoords} />
                    <MapClickHandler setCoords={setMapCoords} />
                    <Circle
                      center={mapCoords}
                      radius={1200}
                      pathOptions={{
                        fillColor: '#d4a849',
                        color: '#b8860b',
                        weight: 2,
                        fillOpacity: 0.35
                      }}
                    />
                  </MapContainer>
                </div>

                <div className="p-3 bg-white border-t border-gray-100 text-[10px] text-gray-400 leading-normal">
                  📍 Peta bergerak otomatis sesuai data alamat yang diketik. Anda juga bisa <span className="font-semibold text-gray-500">klik di area peta</span> untuk menyesuaikan titik pusat radius area pengiriman.
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
