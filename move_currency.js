const fs = require('fs');
const filePath = './apps/admin/src/pages/OrdersList.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove the useEffect that syncs phoneCode with selectedCurrency
const syncUseEffectRegex = /\/\/ Sync default phone country with selected currency[\s\S]*?\}, \[selectedCurrency\]\);\n/m;
content = content.replace(syncUseEffectRegex, '');

// 2. Remove "Mata Uang" from top grid
const mataUangTopRegex = /<div>\s*<label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mata Uang \*\<\/label>\s*<select\s*value=\{selectedCurrency\}[\s\S]*?<\/select>\s*<\/div>/m;
const mataUangHtml = content.match(mataUangTopRegex)[0];
content = content.replace(mataUangTopRegex, '');

// 3. Fix the top grid columns if necessary. We should change md:grid-cols-2 to not have an empty space if it's just Status. But wait, "Status Pesanan" was side by side with "Mata Uang". If we remove Mata Uang, we can leave it as grid-cols-1 or just let it take full width. Wait, the grid was `grid-cols-1 md:grid-cols-2`. It had Status and Mata Uang. Now it only has Status. We can change it to `grid-cols-1` or leave it. Let's just replace `md:grid-cols-2` with `md:grid-cols-1` for that specific div if possible, but actually we can just let it be. Let's just leave the gap. Actually, better to remove the top grid wrapper if it only has Status, but wait, there is Nama Pelanggan and Nomor Telepon right below it!
// Ah, let's check lines 718-770 to see the grid structure.

// Instead of guessing, let's inject "Mata Uang" just before "Rincian Pembayaran".
const rincianPembayaranRegex = /{?\/\* Total Summary \*\/}?/;
const newRincianWrapper = `
              {/* Mata Uang Selection */}
              <div className="mt-6">
                ${mataUangHtml}
              </div>

              {/* Total Summary */}
`;
content = content.replace(rincianPembayaranRegex, newRincianWrapper);

// 4. Inject exchange rates and converted total
const exchangeRates = `
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
`;

content = content.replace(/const \[manualOrderLoading, setManualOrderLoading\] = useState\(false\);/, match => exchangeRates + '\n  ' + match);

// In Rincian Pembayaran, calculate final IDR total, then show converted total if selectedCurrency !== 'IDR'
const totalKeseluruhanRegex = /<span className="text-xl font-black text-yellow-600 dark:text-yellow-500">[\s\S]*?<\/span>\s*<\/div>\s*<\/div>/m;

// Find the match
const match = content.match(totalKeseluruhanRegex);
if(match) {
  const originalTotalStr = match[0];
  
  // We need to calculate finalTotal to display it in the selected currency. 
  // Let's add a dynamic calculation block right after Total Keseluruhan.
  const replacementTotal = `
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
  `;
  content = content.replace(originalTotalStr, replacementTotal);
}

fs.writeFileSync(filePath, content);
console.log("SUCCESS");
