import React from 'react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
          Welcome to Djiharkah Store
        </h1>
        <p className="text-xl text-gray-600">
          Discover our amazing collection of products. Quality meets style right here.
        </p>
        <button className="bg-indigo-600 text-white px-8 py-3 rounded-full font-medium hover:bg-indigo-700 transition-colors shadow-md">
          Shop Now
        </button>
      </div>
      
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {/* Product placeholders */}
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-48 bg-gray-200 w-full animate-pulse"></div>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Awesome Product {i}</h3>
              <p className="text-gray-500 text-sm mb-4">Brief description of the product goes here. High quality and affordable.</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-indigo-600">$99.00</span>
                <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800">Add to cart</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
