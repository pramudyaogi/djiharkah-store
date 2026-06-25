import React from 'react';

export default function Dashboard() {
  return (
    <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
      <h3 className="text-lg font-medium leading-6 text-gray-900">Dashboard Overview</h3>
      <p className="mt-2 text-sm text-gray-500">
        Welcome to the admin panel. Here you can manage your products, orders, and customers.
      </p>
      
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder cards */}
        <div className="bg-indigo-50 overflow-hidden shadow-sm rounded-lg border border-indigo-100 p-6 flex flex-col justify-center items-center">
          <dt className="text-sm font-medium text-indigo-500 truncate mb-2">Total Products</dt>
          <dd className="text-4xl font-bold text-gray-900">0</dd>
        </div>
        <div className="bg-green-50 overflow-hidden shadow-sm rounded-lg border border-green-100 p-6 flex flex-col justify-center items-center">
          <dt className="text-sm font-medium text-green-500 truncate mb-2">Total Orders</dt>
          <dd className="text-4xl font-bold text-gray-900">0</dd>
        </div>
        <div className="bg-blue-50 overflow-hidden shadow-sm rounded-lg border border-blue-100 p-6 flex flex-col justify-center items-center">
          <dt className="text-sm font-medium text-blue-500 truncate mb-2">Total Customers</dt>
          <dd className="text-4xl font-bold text-gray-900">0</dd>
        </div>
      </div>
    </div>
  );
}
