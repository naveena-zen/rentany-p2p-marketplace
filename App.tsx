import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { ItemDetail } from './pages/ItemDetail';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { RenterDashboard } from './pages/RenterDashboard';
import { ArbitratorDashboard } from './pages/ArbitratorDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  if (loading) return <p style={{ textAlign: 'center', padding: '3rem' }}>Authenticating...</p>;
  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && !user.roles.includes(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/items/:id" element={<ItemDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                path="/owner"
                element={
                  <ProtectedRoute requiredRole="OWNER">
                    <OwnerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <RenterDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/arbitrator"
                element={
                  <ProtectedRoute requiredRole="ADMIN_ARBITRATOR">
                    <ArbitratorDashboard />
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
};

export default App;
