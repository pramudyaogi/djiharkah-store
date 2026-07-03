const fs = require('fs');

const filePath = './apps/admin/src/pages/OrdersList.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `{/* Grid 2: Kategori & Produk & Jumlah */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">`;

const endIndex = content.indexOf('              <div className="w-full h-px bg-gray-150 dark:border-zinc-800 my-4" />', content.indexOf(targetStr));

if (content.indexOf(targetStr) === -1 || endIndex === -1) {
    console.log("NOT FOUND");
    process.exit(1);
}

const replacementStr = `{/* Produk & Harga Negosiasi */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Daftar Produk *</h4>
                  <button type="button" onClick={handleAddItem} className="text-xs font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 px-3 py-1.5 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-500/20 transition-colors flex items-center gap-1">
                    <span>➕</span> Tambah Produk
                  </button>
                </div>
                
                <div className="space-y-4">
                  {manualOrder.items.map((item, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 dark:bg-zinc-950 border border-gray-150 dark:border-zinc-850 rounded-2xl relative">
                      {manualOrder.items.length > 1 && (
                        <button type="button" onClick={() => handleRemoveItem(index)} className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-500/20 text-red-500 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors shadow-sm">
                          ✕
                        </button>
                      )}
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Pilih Produk</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemProductChange(index, e.target.value)}
                          className={\`w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none \${
                            manualOrderErrors[\`item_product_\${index}\`] ? 'border-red-300' : 'border-gray-200 dark:border-zinc-800 focus:border-yellow-600'
                          }\`}
                        >
                          <option value="">-- Pilih Produk --</option>
                          {productsList.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Rp {Number(p.price).toLocaleString('id-ID')})
                            </option>
                          ))}
                        </select>
                        {manualOrderErrors[\`item_product_\${index}\`] && <p className="text-red-500 text-[10px] mt-1">{manualOrderErrors[\`item_product_\${index}\`]}</p>}
                      </div>
                      <div className="w-full md:w-32">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Kuantitas</label>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/^0+/, '');
                            handleItemQuantityChange(index, val === '' ? 0 : parseInt(val));
                          }}
                          className={\`w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none \${
                            manualOrderErrors[\`item_qty_\${index}\`] ? 'border-red-300' : 'border-gray-200 dark:border-zinc-800 focus:border-yellow-600'
                          }\`}
                        />
                        {manualOrderErrors[\`item_qty_\${index}\`] && <p className="text-red-500 text-[10px] mt-1">{manualOrderErrors[\`item_qty_\${index}\`]}</p>}
                      </div>
                    </div>
                  ))}
                </div>
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
                          className={\`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none \${
                            autoCalculateShipping ? 'bg-yellow-600 dark:bg-yellow-500' : 'bg-gray-300 dark:bg-zinc-700'
                          }\`}
                        >
                          <span
                            className={\`inline-block h-3 w-3 transform rounded-full bg-white transition-transform \${
                              autoCalculateShipping ? 'translate-x-[14px]' : 'translate-x-[2px]'
                            }\`}
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
                      className={\`w-full px-4 py-2.5 border rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:bg-white dark:focus:bg-zinc-950 transition-all \${
                        autoCalculateShipping 
                          ? 'bg-gray-100 dark:bg-zinc-900 text-gray-400 dark:text-zinc-500 border-gray-200 dark:border-zinc-800 cursor-not-allowed' 
                          : 'bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 focus:border-yellow-600'
                      }\`}
                    />
                  </div>
                )}
              </div>
`;

content = content.substring(0, content.indexOf(targetStr)) + replacementStr + content.substring(endIndex);

fs.writeFileSync(filePath, content);
console.log("SUCCESS");
