const fs = require('fs');

const filePath = './apps/admin/src/pages/OrdersList.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add productModal state
const modalStateInjection = `
  const [productModal, setProductModal] = useState({
    isOpen: false,
    editIndex: -1,
    item: { productId: '', quantity: 1, isCustom: false, customName: '', customPrice: '' }
  });
`;
content = content.replace(/const \[successModal, setSuccessModal\] = useState\(\{[\s\S]*?\}\);/m, (match) => match + '\n' + modalStateInjection);

// 2. Replace handleItem handlers
const handlersRegex = /const handleItemProductChange = \(index, prodId\) => \{[\s\S]*?const handleRemoveItem = \(index\) => \{[\s\S]*?\}\)\);\s*\};/m;
const newHandlers = `
  const handleOpenProductModal = (index = -1) => {
    if (index >= 0) {
      setProductModal({ isOpen: true, editIndex: index, item: { ...manualOrder.items[index] } });
    } else {
      setProductModal({ isOpen: true, editIndex: -1, item: { productId: '', quantity: 1, isCustom: false, customName: '', customPrice: '' } });
    }
  };

  const handleSaveProductModal = () => {
    const { item, editIndex } = productModal;
    
    // Validation
    if (item.isCustom) {
      if (!item.customName.trim()) return alert('Nama produk wajib diisi');
      if (!item.customPrice || parseFloat(item.customPrice) <= 0) return alert('Harga wajib diisi');
    } else {
      if (!item.productId) return alert('Pilih produk');
    }
    if (item.quantity <= 0) return alert('Kuantitas min 1');

    setManualOrder(prev => {
      const newItems = [...prev.items];
      if (editIndex >= 0) {
        newItems[editIndex] = item;
      } else {
        newItems.push(item);
      }
      return { ...prev, items: newItems };
    });
    setProductModal({ isOpen: false, editIndex: -1, item: { productId: '', quantity: 1, isCustom: false, customName: '', customPrice: '' } });
  };

  const handleRemoveItem = (index) => {
    setManualOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };
`;
content = content.replace(handlersRegex, newHandlers);


// 3. Update table rendering to static + Edit button
const tableRegex = /<tbody className="divide-y divide-gray-150 dark:divide-zinc-850">[\s\S]*?<\/tbody>/m;
const newTable = `<tbody className="divide-y divide-gray-150 dark:divide-zinc-850">
                        {manualOrder.items.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-gray-400 dark:text-zinc-500 italic text-xs">
                              Belum ada produk ditambahkan
                            </td>
                          </tr>
                        ) : manualOrder.items.map((item, index) => {
                          const product = productsList.find(p => p.id === item.productId);
                          const unitPrice = item.isCustom ? (parseFloat(item.customPrice) || 0) : (product ? product.price : 0);
                          const subtotal = (parseInt(item.quantity) || 0) * unitPrice;
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                              <td className="px-4 py-3 align-middle text-gray-900 dark:text-zinc-100 font-medium">
                                {item.isCustom ? (
                                  <div>
                                    <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-500 text-[9px] px-1.5 py-0.5 rounded-md mr-2 font-bold uppercase">Kustom</span>
                                    {item.customName}
                                  </div>
                                ) : (
                                  product ? product.name : 'Produk tidak ditemukan'
                                )}
                              </td>
                              
                              <td className="px-4 py-3 align-middle text-center text-gray-900 dark:text-zinc-100 font-medium">
                                {item.quantity}
                              </td>
                              
                              <td className="px-4 py-3 align-middle text-right text-gray-900 dark:text-zinc-100 font-medium">
                                Rp {Number(unitPrice).toLocaleString('id-ID')}
                              </td>
                              
                              <td className="px-4 py-3 align-middle text-right">
                                <div className="text-yellow-600 dark:text-yellow-500 font-bold">
                                  Rp {Number(subtotal).toLocaleString('id-ID')}
                                </div>
                              </td>
                              
                              <td className="px-4 py-3 align-middle text-center whitespace-nowrap">
                                <button type="button" onClick={() => handleOpenProductModal(index)} className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors inline-block mr-1">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button type="button" onClick={() => handleRemoveItem(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors inline-block">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>`;
content = content.replace(tableRegex, newTable);

// 4. Update the "Tambah Produk" button to use handleOpenProductModal
content = content.replace(/onClick=\{handleAddItem\}/g, 'onClick={() => handleOpenProductModal(-1)}');

// 5. Change "Potongan Negosiasi" color from green to yellow
const negosiasiRegex = /text-green-600 dark:text-green-500/g;
content = content.replace(negosiasiRegex, 'text-yellow-600 dark:text-yellow-500');

// 6. Inject the Modal markup before {/* Success Modal */}
const modalMarkup = `
      {/* Product Add/Edit Modal */}
      {productModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-2xl animate-zoom-in relative">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-150 dark:border-zinc-800 pb-3">
              {productModal.editIndex >= 0 ? 'Edit Produk' : 'Tambah Produk'}
            </h3>
            
            <div className="space-y-4">
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
                    {productsList.map(p => (
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
                  min="1"
                  value={productModal.item.quantity}
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+/, '');
                    setProductModal(prev => ({ ...prev, item: { ...prev.item, quantity: val === '' ? '' : parseInt(val) } }));
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-gray-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-yellow-600"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-150 dark:border-zinc-800 justify-end">
              <button
                type="button"
                onClick={() => setProductModal({ isOpen: false, editIndex: -1, item: { productId: '', quantity: 1, isCustom: false, customName: '', customPrice: '' } })}
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
content = content.replace(/\{\/\* Success Modal \*\/\}/g, modalMarkup + '\n      {/* Success Modal */}');

fs.writeFileSync(filePath, content);
console.log("REFACTOR SUCCESS");
