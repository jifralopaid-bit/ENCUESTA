import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Votacion from './pages/Votacion';
import Transparencia from './pages/Transparencia';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import SidebarQueue from './components/SidebarQueue';
import WelcomeModal from './components/WelcomeModal';
import RevocationModal from './components/RevocationModal';
import ErrorBoundary from './components/ErrorBoundary';

import Maintenance from './pages/Maintenance';

const MODO_MANTENIMIENTO = false; // Activar para mostrar la pantalla de mantenimiento

function App() {
  return (
    <ErrorBoundary>
      <Router>
        {!MODO_MANTENIMIENTO && (
          <>
            <SidebarQueue />
            <WelcomeModal />
            <RevocationModal />
          </>
        )}
        
        <Routes>
          {/* Rutas Públicas */}
          {MODO_MANTENIMIENTO ? (
            <Route path="*" element={<Maintenance />} />
          ) : (
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="votacion" element={<Votacion />} />
              <Route path="transparencia" element={<Transparencia />} />
            </Route>
          )}

          {/* Rutas de Administración */}
          <Route path="/panel-secure-administracion" element={<Navigate to="/panel-secure-administracion/dashboard" replace />} />
          <Route path="/panel-secure-administracion/login" element={<AdminLogin />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/panel-secure-administracion/dashboard" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
