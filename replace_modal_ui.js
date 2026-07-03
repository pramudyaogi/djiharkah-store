const fs = require('fs');

const filePath = './apps/admin/src/pages/OrdersList.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add local states for modal filtering
const modalStateSearchReplace = `
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalCategoryId, setModalCategoryId] = useState('');
`;

content = content.replace(
  /const \[productModal, setProductModal\] = useState\(\{[\s\S]*?\}\);/m,
  (match) => match + '\n' + modalStateSearchReplace
);

// We need to modify handleOpenProductModal to reset search/category when opening
const handleOpenRegex = /const handleOpenProductModal = \(index = -1\) => \{[\s\S]*?\};\n/m;
const newHandleOpen = `const handleOpenProductModal = (index = -1) => {
    setModalSearchQuery('');
    setModalCategoryId('');
    if (index >= 0) {
      setProductModal({ isOpen: true, editIndex: index, item: { ...manualOrder.items[index] } });
    } else {
      setProductModal({ isOpen: true, editIndex: -1, item: { productId: '', quantity: 0, isCustom: false, customName: '', customPrice: '' } });
    }
  };
`;
content = content.replace(handleOpenRegex, newHandleOpen);


// In the Product Add/Edit Modal, we need to inject the filter UI and modify the productsList mapping
const modalMarkupRegex = /\{\/\* Product Add\/Edit Modal \*\/\}([\s\S]*?)\{\/\* Success Modal \*\/\}/m;

// Calculate filtered products inside the component
// Since we can't easily inject complex logic into the render method body via regex without messing up, we'll do it inline in the JSX:
// {productsList.filter(p => (!modalCategoryId || p.category_id === modalCategoryId) && (!modalSearchQuery || p.name.toLowerCase().includes(modalSearchQuery.toLowerCase()))).map(p => ( ... ))}

const newModalMarkup = `{/* Product Add/Edit Modal */}
      {productModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-2xl animate-zoom-in relative">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-150 dark:border-zinc-800 pb-3">
              {productModal.editIndex >= 0 ? 'Edit Produk' : 'Tambah Produk'}
            </h3>
            
            <div className="space-y-4">
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
                  value={productModal.item.isCustom ? 'custom' : productModal.item.productId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setProductModal(prev => ({ ...prev, item: { ...prev.item, productId: '', isCustom: true } }));
                    } else {
                      setProductModal(prev => ({ ...prev, item: { ...prev.item, productId: val, isCustom: false, customName: '', customPrice: '' } }));
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600"
                >
                  <option value="">-- Pilih Produk --</option>
                  <option value="custom" className="font-bold text-yellow-600">➕ Input Produk Kustom / Manual</option>
                  <optgroup label="Dari Katalog">
                    {productsList
                      .filter(p => (!modalCategoryId || p.category_id === modalCategoryId) && (!modalSearchQuery || p.name.toLowerCase().includes(modalSearchQuery.toLowerCase())))
                      .map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {productModal.item.isCustom && (
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

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kuantitas *</label>
                <input
                  type="number"
                  min="0"
                  value={productModal.item.quantity}
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+/, '');
                    setProductModal(prev => ({ ...prev, item: { ...prev.item, quantity: val === '' ? 0 : parseInt(val) } }));
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-150 dark:border-zinc-800 justify-end">
              <button
                type="button"
                onClick={() => setProductModal({ isOpen: false, editIndex: -1, item: { productId: '', quantity: 0, isCustom: false, customName: '', customPrice: '' } })}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveProductModal}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-yellow-600 hover:bg-yellow-700 text-white dark:bg-yellow-550 dark:hover:bg-yellow-600 dark:text-hitam transition-all"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(modalMarkupRegex, newModalMarkup + '\n      {/* Success Modal */}');

// Let's also make sure handleSaveProductModal uses quantity > 0 checking, which it already does but let's double check.
fs.writeFileSync(filePath, content);
console.log("SUCCESS");
