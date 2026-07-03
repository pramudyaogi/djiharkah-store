const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps', 'store', 'src', 'pages', 'Checkout.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
if (!content.includes('useCart')) {
  content = content.replace(
    "import useCurrencyStore from '../store/useCurrencyStore';",
    "import useCurrencyStore from '../store/useCurrencyStore';\nimport { useCart } from '../contexts/CartContext';"
  );
}

// 2. Replace location.state logic with useCart
const oldStateLogic = `  const location = useLocation();
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
  const totalSubtotal = promoSubtotal + normalSubtotal;`;

const newStateLogic = `  const location = useLocation();
  const navigate = useNavigate();
  
  const { cartItems, clearCart } = useCart();
  
  // If cart is empty, redirect to home
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      navigate('/');
    }
  }, [cartItems, navigate]);

  const totalSubtotal = cartItems?.reduce((total, item) => {
    return total + (item.promoQty * item.promoPrice) + (item.normalQty * item.normalPrice);
  }, 0) || 0;
  
  const product = cartItems?.[0]?.product || {}; // For fallback properties like free_shipping check (simplified)`;

content = content.replace(oldStateLogic, newStateLogic);

// 3. Replace supabase call in handleCheckout
const oldSupabaseCall = `      const { data: orderData, error: orderError } = await supabase.rpc('create_guest_order', {
        p_name: formData.name,
        p_phone: formData.phone,
        p_email: '',
        p_address: finalAddress,
        p_product_id: product.id,
        p_quantity: quantity,
        p_unit_price: product.price,
        p_shipping_cost: shippingCost,
        p_promo_qty: promoQty,
        p_promo_price: promoPrice,
        p_normal_qty: normalQty,
        p_normal_price: normalPrice
      });`;

const newSupabaseCall = `      
      const p_items = cartItems.map(item => ({
        product_id: item.product.id,
        promoQty: item.promoQty,
        promoPrice: item.promoPrice,
        normalQty: item.normalQty,
        normalPrice: item.normalPrice
      }));

      const { data: orderData, error: orderError } = await supabase.rpc('create_guest_order_multi', {
        p_name: formData.name,
        p_phone: formData.phone,
        p_email: '',
        p_address: finalAddress,
        p_shipping_cost: shippingCost,
        p_items: p_items,
        p_notes: notes || null
      });`;

content = content.replace(oldSupabaseCall, newSupabaseCall);

// Clear cart on success
const successRegex = /setSuccess\(true\);\s*setTrackingCode\(orderData\.tracking_code\);/;
if (!content.includes('clearCart();')) {
  content = content.replace(successRegex, "setSuccess(true);\n        setTrackingCode(orderData.tracking_code);\n        clearCart();");
}

// 4. Update UI Rincian Pesanan
const oldRincian = `<div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                  {product.images && product.images.length > 0 ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex justify-center items-center text-xs text-gray-300 font-medium">No Img</div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-hitam text-sm line-clamp-2">{product.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">Kuantitas: {quantity}</p>
                </div>
              </div>

              <div className="bg-gray-50/80 rounded-xl p-4 mb-6 border border-gray-100/80 mt-4">
                {isPromoActive ? (
                  <div className="space-y-2">
                    {promoQty > 0 && (
                      <p className="text-xs text-gray-500 flex justify-between">
                        <span>{promoQty} × {formatPrice(promoPrice, currency, rates)} <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded ml-1 font-bold">PROMO</span></span>
                      </p>
                    )}
                    {normalQty > 0 && (
                      <p className="text-xs text-gray-500 flex justify-between">
                        <span>{normalQty} × {formatPrice(normalPrice, currency, rates)} <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded ml-1 font-bold">NORMAL</span></span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">{quantity} × {formatPrice(product.price, currency, rates)}</p>
                )}
              </div>`;

const newRincian = `<div className="max-h-60 overflow-y-auto pr-2 space-y-4 mb-4">
                {cartItems?.map(item => {
                  const p = item.product;
                  const imgUrl = p.images?.[0] || p.image_url;
                  const isPromoActive = !!p.promo_type;
                  return (
                    <div key={p.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                          {imgUrl ? (
                            <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex justify-center items-center text-xs text-gray-300 font-medium">No Img</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-hitam text-sm line-clamp-2">{p.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">Kuantitas: {item.quantity}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50/80 rounded-xl p-3 mt-3 border border-gray-100/80">
                        {isPromoActive ? (
                          <div className="space-y-1">
                            {item.promoQty > 0 && (
                              <p className="text-xs text-gray-500 flex justify-between items-center">
                                <span>{item.promoQty} × {formatPrice(item.promoPrice, currency, rates)}</span>
                                <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Promo</span>
                              </p>
                            )}
                            {item.normalQty > 0 && (
                              <p className="text-xs text-gray-500 flex justify-between items-center">
                                <span>{item.normalQty} × {formatPrice(item.normalPrice, currency, rates)}</span>
                                <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Normal</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 flex justify-between">
                            <span>{item.quantity} × {formatPrice(p.price, currency, rates)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>`;

content = content.replace(oldRincian, newRincian);

fs.writeFileSync(filePath, content);
console.log('SUCCESS');
