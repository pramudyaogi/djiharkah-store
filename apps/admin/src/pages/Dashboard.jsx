import React from 'react';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold leading-6 text-white tracking-tight">Dashboard Overview</h3>
        <p className="mt-3 text-sm text-zinc-400">
          Selamat datang di panel admin. Kelola katalog produk, pesanan, dan pelanggan Anda di sini.
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Products */}
        <div className="bg-zinc-900/50 backdrop-blur-sm overflow-hidden rounded-2xl border border-zinc-800/80 p-8 flex flex-col justify-center items-center transition-all hover:border-yellow-500/30 hover:shadow-[0_0_30px_rgba(234,179,8,0.05)] relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-800 to-zinc-800 group-hover:from-yellow-600 group-hover:to-yellow-400 transition-all duration-500"></div>
          <dt className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Total Products</dt>
          <dd className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400">0</dd>
        </div>
        
        {/* Card 2: Orders */}
        <div className="bg-zinc-900/50 backdrop-blur-sm overflow-hidden rounded-2xl border border-zinc-800/80 p-8 flex flex-col justify-center items-center transition-all hover:border-yellow-500/30 hover:shadow-[0_0_30px_rgba(234,179,8,0.05)] relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-800 to-zinc-800 group-hover:from-yellow-600 group-hover:to-yellow-400 transition-all duration-500"></div>
          <dt className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Total Orders</dt>
          <dd className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400">0</dd>
        </div>

        {/* Card 3: Customers */}
        <div className="bg-zinc-900/50 backdrop-blur-sm overflow-hidden rounded-2xl border border-zinc-800/80 p-8 flex flex-col justify-center items-center transition-all hover:border-yellow-500/30 hover:shadow-[0_0_30px_rgba(234,179,8,0.05)] relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-800 to-zinc-800 group-hover:from-yellow-600 group-hover:to-yellow-400 transition-all duration-500"></div>
          <dt className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Total Customers</dt>
          <dd className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400">0</dd>
        </div>
      </div>
    </div>
  );
}
