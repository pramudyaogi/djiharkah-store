const fs = require('fs');
const filePath = './apps/admin/src/pages/OrdersList.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. productId Select
let productIdSelectRegex = /<select\s*value=\{productModal\.item\.productId\}\s*onChange=\{\(e\) => setProductModal\(prev => \(\{ \.\.\.prev, item: \{ \.\.\.prev\.item, productId: e\.target\.value \} \}\)\)\}\s*className="w-full px-4 py-2\.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600"/m;

let replacementSelect = `<select
                      value={productModal.item.productId}
                      onChange={(e) => setProductModal(prev => ({ ...prev, item: { ...prev.item, productId: e.target.value } }))}
                      className={\`w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600 \${productModal.errors?.productId ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800'}\`}
                    >`;

if (content.match(productIdSelectRegex)) {
  content = content.replace(productIdSelectRegex, replacementSelect);
  // add error message
  content = content.replace(/(<\/select>\s*)<\/div>/m, '$1  {productModal.errors?.productId && <p className="text-red-500 text-xs mt-1">{productModal.errors.productId}</p>}\n                  </div>');
} else {
  console.log('productId Select not found');
}


// 2. customName Input
let customNameRegex = /<input\s*type="text"\s*value=\{productModal\.item\.customName\}\s*onChange=\{\(e\) => setProductModal\(prev => \(\{ \.\.\.prev, item: \{ \.\.\.prev\.item, customName: e\.target\.value \} \}\)\)\}\s*placeholder="Contoh: BHS Eceran"\s*className="w-full px-4 py-2\.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600"\s*\/>/m;

let replacementName = `<input
                      type="text"
                      value={productModal.item.customName}
                      onChange={(e) => setProductModal(prev => ({ ...prev, item: { ...prev.item, customName: e.target.value } }))}
                      placeholder="Contoh: BHS Eceran"
                      className={\`w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600 \${productModal.errors?.customName ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800'}\`}
                    />
                    {productModal.errors?.customName && <p className="text-red-500 text-xs mt-1">{productModal.errors.customName}</p>}`;

if (content.match(customNameRegex)) {
  content = content.replace(customNameRegex, replacementName);
} else {
  console.log('customName not found');
}

// 3. customPrice Input
let customPriceRegex = /<input\s*type="text"\s*inputMode="numeric"\s*value=\{productModal\.item\.customPrice\}\s*onChange=\{\(e\) => \{\s*const val = e\.target\.value\.replace\(\/\[\^0-9\.\]\/g, ''\);\s*setProductModal\(prev => \(\{ \.\.\.prev, item: \{ \.\.\.prev\.item, customPrice: val \} \}\)\);\s*\}\}\s*className="w-full pl-11 pr-4 py-2\.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600"\s*\/>/m;

let replacementPrice = `<input
                        type="text"
                        inputMode="numeric"
                        value={productModal.item.customPrice}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setProductModal(prev => ({ ...prev, item: { ...prev.item, customPrice: val } }));
                        }}
                        className={\`w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600 \${productModal.errors?.customPrice ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800'}\`}
                      />`;

if (content.match(customPriceRegex)) {
  content = content.replace(customPriceRegex, replacementPrice);
  content = content.replace(/(<\/div>\s*)<\/div>\s*<\/>/m, '$1  {productModal.errors?.customPrice && <p className="text-red-500 text-xs mt-1">{productModal.errors.customPrice}</p>}\n                  </div>\n                </>');
} else {
  console.log('customPrice not found');
}

// 4. quantity Input
let quantityRegex = /<input\s*type="text"\s*inputMode="numeric"\s*value=\{productModal\.item\.quantity\}\s*onChange=\{\(e\) => \{\s*const val = e\.target\.value\.replace\(\/\[\^0-9\]\/g, ''\)\.replace\(\/\^0\+\/, ''\);\s*setProductModal\(prev => \(\{ \.\.\.prev, item: \{ \.\.\.prev\.item, quantity: val \} \}\)\);\s*\}\}\s*placeholder="Contoh: 1"\s*className="w-full px-4 py-2\.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600"\s*\/>/m;

let replacementQuantity = `<input
                  type="text"
                  inputMode="numeric"
                  value={productModal.item.quantity}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
                    setProductModal(prev => ({ ...prev, item: { ...prev.item, quantity: val } }));
                  }}
                  placeholder="Contoh: 1"
                  className={\`w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600 \${productModal.errors?.quantity ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-zinc-800'}\`}
                />
                {productModal.errors?.quantity && <p className="text-red-500 text-xs mt-1">{productModal.errors.quantity}</p>}`;

if (content.match(quantityRegex)) {
  content = content.replace(quantityRegex, replacementQuantity);
} else {
  console.log('quantity not found');
}

fs.writeFileSync(filePath, content);
console.log('SUCCESS');
