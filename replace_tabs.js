const fs = require('fs');
const filePath = './apps/admin/src/pages/OrdersList.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetRegex = /<div className="space-y-4">[\s\S]*?(?=<div>\s*<label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kuantitas \*\<\/label>)/m;

const replacement = `<div className="space-y-4">
              <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setProductModal(prev => ({ ...prev, item: { ...prev.item, isCustom: false, customName: '', customPrice: '' } }))}
                  className={\`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all \${!productModal.item.isCustom ? 'bg-white dark:bg-zinc-900 text-yellow-600 dark:text-yellow-500 shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'}\`}
                >
                  Dari Katalog
                </button>
                <button
                  type="button"
                  onClick={() => setProductModal(prev => ({ ...prev, item: { ...prev.item, isCustom: true, productId: '' } }))}
                  className={\`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all \${productModal.item.isCustom ? 'bg-white dark:bg-zinc-900 text-yellow-600 dark:text-yellow-500 shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'}\`}
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
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600"
                    >
                      <option value="">-- Pilih Produk --</option>
                      {productsList
                        .filter(p => (!modalCategoryId || p.category_id === modalCategoryId) && (!modalSearchQuery || p.name.toLowerCase().includes(modalSearchQuery.toLowerCase())))
                        .map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>
                      ))}
                    </select>
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
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600"
                    />
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
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600"
                      />
                    </div>
                  </div>
                </>
              )}

              `;

content = content.replace(targetRegex, replacement);
fs.writeFileSync(filePath, content);
console.log("SUCCESS");
