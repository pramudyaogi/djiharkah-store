import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useCartStore from '../store/useCartStore';

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, categories(name, slug)')
          .eq('slug', slug)
          .single();
        
        if (error) throw error;
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [slug]);

  if (loading) return <div className="text-emas font-playfair text-xl py-20 text-center">Memuat produk...</div>;
  if (!product) return <div className="text-hitam font-playfair text-xl py-20 text-center">Produk tidak ditemukan.</div>;

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm mb-8">
        <Link to="/" className="text-abu-abu hover:text-emas transition-colors">Home</Link>
        <span className="mx-3 text-gray-400">/</span>
        <Link to="/products" className="text-abu-abu hover:text-emas transition-colors">Produk</Link>
        <span className="mx-3 text-gray-400">/</span>
        <span className="text-emas font-medium">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Image */}
        <div className="bg-gray-100 border border-gray-200 h-96 md:h-[500px] flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 font-playfair text-2xl">No Image</span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <h1 className="text-4xl md:text-5xl font-playfair font-bold text-hitam mb-4">{product.name}</h1>
          <div className="text-3xl font-bold text-emas mb-6">Rp {product.price.toLocaleString('id-ID')}</div>
          
          <div className="mb-8">
            <h3 className="text-sm font-bold text-hitam uppercase tracking-wider mb-2">Deskripsi</h3>
            <p className="text-abu-abu leading-relaxed">
              {product.description || "Tidak ada deskripsi untuk produk ini."}
            </p>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-4 text-sm text-abu-abu mb-2">
              <span className="font-bold">Kategori:</span> 
              <span>{product.categories?.name}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-abu-abu">
              <span className="font-bold">Stok:</span> 
              <span>{product.stock > 0 ? `${product.stock} tersedia` : 'Habis'}</span>
            </div>
          </div>

          <div className="mt-auto flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => addItem(product)}
              disabled={product.stock <= 0}
              className="flex-1 bg-emas text-hitam py-4 font-bold text-lg hover:bg-hitam hover:text-emas transition-colors border border-transparent hover:border-emas disabled:opacity-50 disabled:cursor-not-allowed"
            >
              TAMBAH KE KERANJANG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
