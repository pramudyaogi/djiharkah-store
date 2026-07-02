import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Store, ChevronLeft, MapPin, Loader2, X, Check, Copy, ChevronDown, Search } from 'lucide-react';
import useCurrencyStore from '../store/useCurrencyStore';
import { formatPrice } from '../utils/currencyHelper';
import { useTranslation } from '../utils/translations';
import { MapContainer, TileLayer, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

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
  const { currency, rates } = useCurrencyStore();
  const { t } = useTranslation();
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
  const [notes, setNotes] = useState('');

  // Sync combined phone number to formData.phone
  useEffect(() => {
    if (localPhone) {
      setFormData(prev => ({ ...prev, phone: `${selectedCountry.code} ${localPhone}` }));
    } else {
      setFormData(prev => ({ ...prev, phone: '' }));
    }
  }, [selectedCountry, localPhone]);

  // Sync default phone country with selected currency
  useEffect(() => {
    if (currency) {
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
      const targetCode = currencyToCountryCode[currency];
      if (targetCode) {
        const matched = countryCodesList.find(c => c.code === targetCode);
        if (matched) {
          setSelectedCountry(matched);
        }
      }
    }
  }, [currency]);


  // Click outside listener for country code dropdown
  useEffect(() => {
    if (!showDropdown) return;
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showDropdown]);

  // Filter country codes list
  const filteredCountries = countryCodesList.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.includes(searchTerm)
  );

  // shipping calculation state
  const [shippingCost, setShippingCost] = useState(0);
  const [addressDetails, setAddressDetails] = useState({
    street: '',
    subdistrict: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Indonesia'
  });
  const [tempAddress, setTempAddress] = useState({ ...addressDetails });
  const [addressErrors, setAddressErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Leaflet Map Coordinates (Default: Jakarta Barat center)
  const [mapCoords, setMapCoords] = useState([-6.1683, 106.7588]);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  
  const geocodeTimerRef = useRef(null);

  useEffect(() => {
    if (product && product.free_shipping !== false) {
      setShippingCost(0);
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateShipping = (provinceName) => {
    if (product && product.free_shipping !== false) {
      setShippingCost(0);
      return;
    }
    if (!provinceName) return;
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
                       
    if (isDomestic) {
      setShippingCost(15000); // Standard flat rate for Indonesia
    } else {
      setShippingCost(150000); // Flat rate for international shipping
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setTempAddress(prev => {
      const updated = { ...prev, [name]: value };
      
      // Clear geocode timer
      if (geocodeTimerRef.current) {
        clearTimeout(geocodeTimerRef.current);
      }
      
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
        setGeocodeError(t('geocode_error'));
      }
    } catch {
      setGeocodeError(t('geocode_load_error'));
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
      errors.street = t('street_required');
    }
    if (!tempAddress.city.trim()) {
      errors.city = t('city_required');
    }
    if (!tempAddress.province.trim()) {
      errors.province = t('province_required');
    }
    if (!tempAddress.country.trim()) {
      errors.country = t('country_required');
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
    if (!formData.name.trim()) errors.name = t('name_required');
    if (!formData.phone.trim()) errors.phone = t('phone_required');
    if (!formData.address.trim()) errors.address = t('address_required');
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
        p_address: notes.trim() ? `${formData.address}\n\nCatatan: ${notes.trim()}` : formData.address,
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
      setError(err.message || t('failed_create_order'));
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return <Navigate to="/products" replace />;
  }

  if (success) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Store size={40} />
        </div>
        <h1 className="text-3xl font-playfair font-bold text-hitam mb-4">{t('order_created_title')}</h1>
        <p className="text-gray-600 mb-6">{t('checkout_success_desc')}</p>
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl max-w-sm mx-auto mb-8">
          <p className="text-sm text-gray-500 mb-2 uppercase tracking-wide font-bold">{t('order_code')}</p>
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
                  <Check size={14} /> {t('copied')}
                </span>
              ) : (
                <Copy size={15} />
              )}
            </button>
          </div>
          <div className="mt-5 p-4 bg-zinc-950 dark:bg-zinc-900 border border-emas/30 rounded-2xl max-w-xs mx-auto text-center shadow-lg transition-all duration-300 hover:border-emas/60">
            <p className="text-emas font-extrabold text-[11px] uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1.5">
              <span>⚠️</span> {t('important')}
            </p>
            <p className="text-gray-200 dark:text-gray-100 text-xs font-semibold leading-relaxed">
              {t('save_code_desc')}
            </p>
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <button onClick={() => navigate('/track-order?code=' + trackingCode)} className="bg-emas text-hitam px-6 py-3 font-bold hover:bg-hitam hover:text-emas transition-colors rounded-lg shadow-sm">{t('track_order')}</button>
          <button onClick={() => navigate('/')} className="bg-gray-100 text-gray-700 px-6 py-3 font-bold hover:bg-gray-200 transition-colors rounded-lg shadow-sm">{t('back_to_home')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-emas transition-colors mb-8 group">
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          {t('back')}
        </button>

        <div className="mb-10">
          <h1 className="text-3xl font-playfair font-bold text-hitam mb-1">Checkout</h1>
          <p className="text-sm text-gray-400">{t('checkout_subtitle')}</p>
        </div>

        {error && <p className="text-red-500 text-sm mb-6 font-medium">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">

          {/* LEFT: Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-7">{t('recipient_details')}</h3>
              <form id="guest-checkout-form" onSubmit={handleCheckout} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('recipient_name')} *</label>
                  <input
                    type="text" name="name" value={formData.name} onChange={handleChange}
                    placeholder={t('recipient_name_placeholder')}
                    className={`w-full px-4 py-3 bg-gray-50/80 border rounded-xl text-hitam text-sm focus:outline-none focus:bg-white transition-all placeholder:text-gray-300 ${validationErrors.name ? 'border-red-300' : 'border-gray-200 focus:border-emas focus:ring-1 focus:ring-emas/20'}`}
                  />
                  {validationErrors.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('phone_number')} *</label>
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
                              placeholder={t('search_country')}
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
                              <div className="px-3 py-2 text-xs text-gray-400 text-center">{t('country_not_found')}</div>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('shipping_address')} *</label>
                  
                  {formData.address ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 relative group">
                      <div className="flex items-start gap-2.5">
                        <MapPin size={16} className="text-emas mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-hitam">{t('shipping_address')}</p>
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{formData.address}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openAddressModal}
                        className="text-xs font-bold text-emas hover:text-hitam transition-colors mt-2 underline"
                      >
                        {t('change_address')}
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
                        {t('fill_address')}
                      </button>
                      {validationErrors.address && <p className="text-red-500 text-xs mt-1.5 font-medium">{validationErrors.address}</p>}
                    </div>
                  )}
                </div>

                {/* Order Notes (Pesan) */}
                <div className="mt-5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {t('order_notes')}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('order_notes_placeholder')}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-hitam text-sm focus:outline-none focus:bg-white focus:border-emas focus:ring-1 focus:ring-emas/20 transition-all placeholder:text-gray-300 resize-none"
                  />
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT: Order Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 h-fit">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-7">{t('order_summary')}</h3>
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
                        {promoQty} × {formatPrice(promoPrice, currency, rates)} ({t('promo_price_label')})
                      </p>
                    )}
                    {normalQty > 0 && (
                      <p className="text-gray-500">
                        {normalQty} × {formatPrice(normalPrice, currency, rates)} ({t('normal_price_label')})
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">{quantity} × {formatPrice(product.price, currency, rates)}</p>
                )}
              </div>
            </div>
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>{t('subtotal')}</span>
                <span>{formatPrice(totalSubtotal, currency, rates)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>{t('shipping_cost')}</span>
                {product.free_shipping !== false ? (
                  <span className="text-green-600 font-semibold">{t('free_shipping')}</span>
                ) : shippingCost > 0 ? (
                  <span className="font-semibold text-hitam">{formatPrice(shippingCost, currency, rates)}</span>
                ) : (
                  <span className="text-gray-400">{t('not_calculated')}</span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center pt-5 border-t border-gray-100 mb-7">
              <span className="font-bold text-hitam text-sm">{t('total')}</span>
              <span className="text-2xl font-bold text-hitam">{formatPrice(totalSubtotal + shippingCost, currency, rates)}</span>
            </div>
            <button
              form="guest-checkout-form"
              type="submit"
              disabled={loading}
              className="w-full bg-emas text-hitam py-4 rounded-xl font-bold text-sm hover:bg-yellow-400 hover:shadow-[0_8px_20px_rgba(212,168,73,0.3)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? t('place_order_processing') : `${t('place_order_btn')} →`}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">{t('checkout_footer_desc')}</p>
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
                <h3 className="text-lg font-bold text-hitam">{t('fill_address')}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{t('address_modal_desc')}</p>
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
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('street_address_label')}</label>
                  <textarea
                    name="street" rows={2} value={tempAddress.street} onChange={handleAddressChange}
                    placeholder={t('street_address_placeholder')}
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
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('subdistrict')}</label>
                    <input
                      type="text" name="subdistrict" value={tempAddress.subdistrict} onChange={handleAddressChange}
                      placeholder={t('subdistrict')}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-hitam text-sm focus:outline-none focus:bg-white focus:border-emas focus:ring-1 focus:ring-emas/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('city')} *</label>
                    <input
                      type="text" name="city" value={tempAddress.city} onChange={handleAddressChange}
                      placeholder={t('city')}
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
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('province')} *</label>
                    <input
                      type="text" name="province" value={tempAddress.province} onChange={handleAddressChange}
                      placeholder={t('province')}
                      className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-hitam text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-emas/20 transition-all ${
                        addressErrors.province ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-emas'
                      }`}
                    />
                    {addressErrors.province && (
                      <p className="text-[11px] text-red-500 font-medium mt-1">{addressErrors.province}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('postal_code')}</label>
                    <input
                      type="text" name="postalCode" value={tempAddress.postalCode} onChange={handleAddressChange}
                      placeholder={t('postal_code')}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-hitam text-sm focus:outline-none focus:bg-white focus:border-emas focus:ring-1 focus:ring-emas/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('country')} *</label>
                  <input
                    type="text" name="country" value={tempAddress.country} onChange={handleAddressChange}
                    placeholder={t('country')}
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
                    <Check size={16} /> {t('save_address')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>

              {/* Map Section inside Modal */}
              <div className="flex flex-col border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50">
                <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-emas" />
                    <span>{t('shipping_location')}</span>
                  </div>
                  {geocoding && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Loader2 size={11} className="animate-spin" />
                      {t('searching_location')}
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
                  {t('map_instruction')}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
