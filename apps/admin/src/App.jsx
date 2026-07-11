import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProductsList from './pages/ProductsList';
import ProductForm from './pages/ProductForm';
import OrdersList from './pages/OrdersList';
import OrderDetail from './pages/OrderDetail';
import Reviews from './pages/Reviews';
import Settings from './pages/Settings';
import SalesReport from './pages/SalesReport';
import ShippingSettings from './pages/ShippingSettings';
import Promotions from './pages/Promotions';
import StockEntries from './pages/StockEntries';

function AppRoutes() {
  const { user, role } = useAuth();
  
  // Custom logic to redirect authenticated admins away from login
  const isAuthAdmin = user && role === 'admin';

  return (
    <Routes>
      <Route path="/login" element={isAuthAdmin ? <Navigate to="/" replace /> : <Login />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductsList />} />
          <Route path="/products/create" element={<ProductForm />} />
          <Route path="/products/edit/:id" element={<ProductForm />} />
          <Route path="/categories" element={<Navigate to="/products" replace />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/sales" element={<SalesReport />} />
          <Route path="/stock-entries" element={<StockEntries />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/shipping" element={<ShippingSettings />} />
        </Route>
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { ToastProvider } from './contexts/ToastContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
