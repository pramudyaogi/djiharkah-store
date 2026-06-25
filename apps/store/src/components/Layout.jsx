import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-grow w-full">
        <Outlet />
      </main>
      <footer className="bg-hitam-gelap text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-emas font-playfair text-xl font-bold mb-4">Djiharkah Store</h3>
              <p className="text-sm">Menyediakan sarung muslim eksklusif dan premium dari berbagai merek terbaik untuk kenyamanan ibadah Anda.</p>
            </div>
            <div>
              <h3 className="text-emas font-playfair text-xl font-bold mb-4">Tautan</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/" className="hover:text-emas-terang transition-colors text-emas">Home</a></li>
                <li><a href="/products" className="hover:text-emas-terang transition-colors text-emas">Produk Kami</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-emas font-playfair text-xl font-bold mb-4">Kontak</h3>
              <ul className="space-y-2 text-sm">
                <li>Email: support@djiharkah.com</li>
                <li>Telepon: +62 812 3456 7890</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            &copy; {new Date().getFullYear()} Djiharkah Store. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
