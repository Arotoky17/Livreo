import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/navigation/Navbar.jsx';
import HomePage from './pages/public/HomePage.jsx';
import PublicTrackingPage from './pages/public/PublicTrackingPage.jsx';
import LoginPage from './pages/public/LoginPage.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import DeliveryDriverPage from './pages/delivery/DeliveryDriverPage.jsx';
import SellerOrdersPage from './pages/seller/SellerOrdersPage.jsx';

// Route gardée par rôle
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        Chargement...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Page d'Accueil conforme à la maquette */}
              <Route path="/" element={<HomePage />} />
              
              {/* Page de Suivi de Commande Client avec Carte & Satellite */}
              <Route path="/tracking" element={<PublicTrackingPage />} />
              
              {/* Page de Connexion */}
              <Route path="/login" element={<LoginPage />} />

              {/* Espaces d'administration et de gestion protégés par rôles */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/delivery"
                element={
                  <ProtectedRoute allowedRoles={['DELIVERY', 'ADMIN']}>
                    <DeliveryDriverPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/seller"
                element={
                  <ProtectedRoute allowedRoles={['SELLER']}>
                    <SellerOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
