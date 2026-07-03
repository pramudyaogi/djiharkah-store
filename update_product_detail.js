const fs = require('fs');
const filePath = './apps/store/src/pages/ProductDetail.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Import useCart
if (!content.includes('useCart')) {
  content = content.replace("import useCurrencyStore from '../store/useCurrencyStore';", "import useCurrencyStore from '../store/useCurrencyStore';\nimport { useCart } from '../contexts/CartContext';");
}

// Add useCart hook call
if (!content.includes('const { addToCart } = useCart();')) {
  content = content.replace("const { currency, rates } = useCurrencyStore();", "const { currency, rates } = useCurrencyStore();\n  const { addToCart } = useCart();");
}

// Modify handleBuyNow -> handleAddToCart
let handleBuyNowRegex = /const handleBuyNow = \(\) => {[\s\S]*?navigate\('\/checkout', \{ state: \{ product, quantity: finalQuantity \} \}\);\s*};/m;

let newHandleAddToCart = `const handleAddToCart = () => {
    const finalQuantity = quantity === '' ? 1 : quantity;
    
    // Calculate promo splits for cart
    const isPromoActive = !!product.promo_type;
    const promoStockAvailable = isPromoActive ? (product.original_stock || 0) : 0;
    const pQty = isPromoActive ? Math.min(finalQuantity, promoStockAvailable) : 0;
    const nQty = isPromoActive ? Math.max(0, finalQuantity - promoStockAvailable) : finalQuantity;
    
    addToCart(
      product, 
      finalQuantity, 
      pQty, 
      product.price, 
      nQty, 
      product.regular_price || product.price
    );
  };`;

content = content.replace(handleBuyNowRegex, newHandleAddToCart);

// Replace button text and onClick
let buttonRegex = /<button\s*onClick=\{handleBuyNow\}\s*disabled=\{product\.promo_type \? product\.original_stock <= 0 : product\.stock <= 0\}\s*className="w-full bg-gradient-to-r from-emas to-yellow-400 text-hitam py-4 rounded-full font-bold text-lg hover:-translate-y-1 hover:shadow-\[0_10px_20px_rgba\(212,168,73,0\.3\)\] transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"\s*>\s*\{t\('buy_now'\)\}\s*<\/button>/m;

let newButton = `<button 
              onClick={handleAddToCart}
              disabled={product.promo_type ? product.original_stock <= 0 : product.stock <= 0}
              className="w-full bg-gradient-to-r from-emas to-yellow-400 text-hitam py-4 rounded-full font-bold text-lg hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(212,168,73,0.3)] transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              <ShoppingCart size={20} /> Masukkan Keranjang
            </button>`;

content = content.replace(buttonRegex, newButton);

fs.writeFileSync(filePath, content);
console.log('SUCCESS');
