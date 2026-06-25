import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <Navbar />
      <main className="flex-grow w-full pb-16">
        <Outlet />
      </main>
      
      {/* Marketplace Footer */}
      <footer className="bg-white border-t-4 border-emas text-abu-abu pt-12 pb-6 text-sm">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-gray-200 pb-8">
            <div>
              <h3 className="text-hitam font-bold mb-4">LAYANAN PELANGGAN</h3>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-emas">Bantuan</a></li>
                <li><a href="#" className="hover:text-emas">Metode Pembayaran</a></li>
                <li><a href="#" className="hover:text-emas">Pengiriman</a></li>
                <li><a href="#" className="hover:text-emas">Pengembalian Barang</a></li>
                <li><a href="#" className="hover:text-emas">Hubungi Kami</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-hitam font-bold mb-4">JELAJAHI DJIHARKAH</h3>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-emas">Tentang Kami</a></li>
                <li><a href="#" className="hover:text-emas">Kebijakan Privasi</a></li>
                <li><a href="#" className="hover:text-emas">Syarat & Ketentuan</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-hitam font-bold mb-4">PEMBAYARAN</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-8 bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">BCA</div>
                <div className="h-8 bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">BNI</div>
                <div className="h-8 bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">MANDIRI</div>
                <div className="h-8 bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">QRIS</div>
                <div className="h-8 bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">ALFAMART</div>
              </div>
            </div>
            <div>
              <h3 className="text-hitam font-bold mb-4">IKUTI KAMI</h3>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-emas flex items-center gap-2">IG: @djiharkah.store</a></li>
                <li><a href="#" className="hover:text-emas flex items-center gap-2">FB: Djiharkah Store</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} Djiharkah Store. All Rights Reserved.</p>
            <p>Negara: Indonesia</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
