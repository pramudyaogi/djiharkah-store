const fs = require('fs');

const filePath = './apps/admin/src/pages/OrdersList.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Modify initial items state in useState
content = content.replace(
  /items: \[\{ productId: '', quantity: 0 \}\]/g,
  `items: [{ productId: '', quantity: 0, isCustom: false, customName: '', customPrice: '' }]`
);

// 2. Modify handleItemProductChange
const handleItemProductChangeRegex = /const handleItemProductChange = \(index, prodId\) => \{[\s\S]*?\};\n/m;
const newHandleItemProductChange = `const handleItemProductChange = (index, prodId) => {
    setManualOrder(prev => {
      const newItems = [...prev.items];
      if (prodId === 'custom') {
        newItems[index] = { ...newItems[index], productId: '', isCustom: true };
      } else {
        newItems[index] = { ...newItems[index], productId: prodId, isCustom: false, customName: '', customPrice: '', quantity: newItems[index].quantity > 0 ? newItems[index].quantity : 1 };
      }
      return { ...prev, items: newItems };
    });
  };

  const handleItemCustomChange = (index, field, value) => {
    setManualOrder(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };\n`;
content = content.replace(handleItemProductChangeRegex, newHandleItemProductChange);

// 3. Modify handleAddItem
const handleAddItemRegex = /items: \[\.\.\.prev\.items, \{ productId: '', quantity: 0 \}\]/g;
content = content.replace(handleAddItemRegex, `items: [...prev.items, { productId: '', quantity: 0, isCustom: false, customName: '', customPrice: '' }]`);

// 4. Modify handleManualOrderSubmit validations
const submitValidationRegex = /manualOrder\.items\.forEach\(\(item, index\) => \{[\s\S]*?if \(!item\.productId\).*?errors\[`item_product_\$\{index\}`\] = 'Pilih produk';\s*hasItemErrors = true;\s*\}([\s\S]*?)\}\);/gm;
const newSubmitValidation = `manualOrder.items.forEach((item, index) => {
      if (item.isCustom) {
        if (!item.customName.trim()) {
          errors[\`item_name_\${index}\`] = 'Nama produk wajib diisi';
          hasItemErrors = true;
        }
        if (!item.customPrice || parseFloat(item.customPrice) <= 0) {
          errors[\`item_price_\${index}\`] = 'Harga wajib diisi';
          hasItemErrors = true;
        }
      } else if (!item.productId) {
        errors[\`item_product_\${index}\`] = 'Pilih produk';
        hasItemErrors = true;
      }
      if (item.quantity <= 0) {
        errors[\`item_qty_\${index}\`] = 'Kuantitas min 1';
        hasItemErrors = true;
      }
      if (!item.isCustom && item.productId) {
        const selectedProd = productsList.find(p => p.id === item.productId);
        if (selectedProd && selectedProd.stock < item.quantity) {
          errors[\`item_qty_\${index}\`] = \`Stok tidak mencukupi (Tersedia: \${selectedProd.stock})\`;
          hasItemErrors = true;
        }
      }
    });`;
content = content.replace(submitValidationRegex, newSubmitValidation);

// 5. Modify formattedItems calculation
const formattedItemsRegex = /const formattedItems = manualOrder\.items\.map\(item => \{[\s\S]*?return \{[\s\S]*?product_id: item\.productId,[\s\S]*?quantity: parseInt\(item\.quantity\) \|\| 1,[\s\S]*?unit_price: product \? product\.price : 0[\s\S]*?\};[\s\S]*?\}\);/gm;
const newFormattedItems = `const formattedItems = manualOrder.items.map(item => {
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
      });`;
content = content.replace(formattedItemsRegex, newFormattedItems);

// 6. Modify the render of "Daftar Produk *"
const renderDaftarProdukStart = `{/* Produk & Harga Negosiasi */}`;
const renderDaftarProdukEnd = `              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">`;

const startIdx = content.indexOf(renderDaftarProdukStart);
const endIdx = content.indexOf(renderDaftarProdukEnd, startIdx);

const newRenderDaftarProduk = `{/* Produk & Harga Negosiasi */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Daftar Produk *</h4>
                  <button type="button" onClick={handleAddItem} className="text-xs font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 px-3 py-1.5 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-500/20 transition-colors flex items-center gap-1">
                    <span>➕</span> Tambah Produk
                  </button>
                </div>
                
                <div className="bg-gray-50 dark:bg-zinc-950 border border-gray-150 dark:border-zinc-850 rounded-2xl overflow-hidden">
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
                        {manualOrder.items.map((item, index) => {
                          const product = productsList.find(p => p.id === item.productId);
                          const unitPrice = item.isCustom ? (parseFloat(item.customPrice) || 0) : (product ? product.price : 0);
                          const subtotal = (parseInt(item.quantity) || 0) * unitPrice;
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                              <td className="px-4 py-3 align-top">
                                <select
                                  value={item.isCustom ? 'custom' : item.productId}
                                  onChange={(e) => handleItemProductChange(index, e.target.value)}
                                  className={\`w-full px-3 py-2 bg-white dark:bg-zinc-900 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none mb-2 \${
                                    manualOrderErrors[\`item_product_\${index}\`] ? 'border-red-300' : 'border-gray-200 dark:border-zinc-800 focus:border-yellow-600'
                                  }\`}
                                >
                                  <option value="">-- Pilih Produk --</option>
                                  <option value="custom" className="font-bold text-yellow-600">➕ Input Produk Kustom / Manual</option>
                                  <optgroup label="Dari Katalog">
                                    {productsList.map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} (Stok: {p.stock})
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>
                                {manualOrderErrors[\`item_product_\${index}\`] && <p className="text-red-500 text-[10px]">{manualOrderErrors[\`item_product_\${index}\`]}</p>}
                                
                                {item.isCustom && (
                                  <div>
                                    <input
                                      type="text"
                                      value={item.customName}
                                      onChange={(e) => handleItemCustomChange(index, 'customName', e.target.value)}
                                      placeholder="Nama produk kustom..."
                                      className={\`w-full px-3 py-2 bg-white dark:bg-zinc-900 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none \${
                                        manualOrderErrors[\`item_name_\${index}\`] ? 'border-red-300' : 'border-gray-200 dark:border-zinc-800 focus:border-yellow-600'
                                      }\`}
                                    />
                                    {manualOrderErrors[\`item_name_\${index}\`] && <p className="text-red-500 text-[10px] mt-1">{manualOrderErrors[\`item_name_\${index}\`]}</p>}
                                  </div>
                                )}
                              </td>
                              
                              <td className="px-4 py-3 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/^0+/, '');
                                    handleItemQuantityChange(index, val === '' ? 0 : parseInt(val));
                                  }}
                                  className={\`w-full px-3 py-2 bg-white dark:bg-zinc-900 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none text-center \${
                                    manualOrderErrors[\`item_qty_\${index}\`] ? 'border-red-300' : 'border-gray-200 dark:border-zinc-800 focus:border-yellow-600'
                                  }\`}
                                />
                                {manualOrderErrors[\`item_qty_\${index}\`] && <p className="text-red-500 text-[10px] mt-1 text-center">{manualOrderErrors[\`item_qty_\${index}\`]}</p>}
                              </td>
                              
                              <td className="px-4 py-3 align-top text-right">
                                {item.isCustom ? (
                                  <div>
                                    <div className="relative">
                                      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">Rp</span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={item.customPrice}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/[^0-9.]/g, '');
                                          handleItemCustomChange(index, 'customPrice', val);
                                        }}
                                        className={\`w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none text-right \${
                                          manualOrderErrors[\`item_price_\${index}\`] ? 'border-red-300' : 'border-gray-200 dark:border-zinc-800 focus:border-yellow-600'
                                        }\`}
                                      />
                                    </div>
                                    {manualOrderErrors[\`item_price_\${index}\`] && <p className="text-red-500 text-[10px] mt-1 text-right">{manualOrderErrors[\`item_price_\${index}\`]}</p>}
                                  </div>
                                ) : (
                                  <div className="py-2 text-gray-900 dark:text-zinc-100 font-medium">
                                    Rp {Number(unitPrice).toLocaleString('id-ID')}
                                  </div>
                                )}
                              </td>
                              
                              <td className="px-4 py-3 align-top text-right">
                                <div className="py-2 text-yellow-600 dark:text-yellow-500 font-bold">
                                  Rp {Number(subtotal).toLocaleString('id-ID')}
                                </div>
                              </td>
                              
                              <td className="px-4 py-3 align-top text-center">
                                {manualOrder.items.length > 1 ? (
                                  <button type="button" onClick={() => handleRemoveItem(index)} className="mt-1.5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors inline-block">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                  </button>
                                ) : (
                                  <div className="w-8 h-8 inline-block"></div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

`;

content = content.substring(0, startIdx) + newRenderDaftarProduk + content.substring(endIdx);

// 7. Update Total Summary
const totalSummaryRegex = /\{\/\* Total Summary \*\/\}([\s\S]*?)<\/div>\s*\{\/\* Modal Buttons \*\/\}/gm;
const newTotalSummary = `{/* Total Summary */}
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
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-zinc-400">Ongkos Kirim</span>
                  <span className="font-medium text-gray-900 dark:text-zinc-200">
                    + Rp {Number(parseFloat(manualOrder.shippingCost) || 0).toLocaleString('id-ID')}
                  </span>
                </div>

                {parseFloat(manualOrder.negotiatedPrice) >= 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-500">
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
                      ) + (parseFloat(manualOrder.shippingCost) || 0)
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Modal Buttons */}`;

content = content.replace(totalSummaryRegex, newTotalSummary);

fs.writeFileSync(filePath, content);
console.log("SUCCESS UI REPLACEMENT");
