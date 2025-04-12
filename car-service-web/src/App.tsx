import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './pages/Dashboard';
import WorkManagement from './pages/WorkManagement';
import VehicleManagement from './pages/VehicleManagement';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
import { RegisterTechnician } from './pages/RegisterTechnician';
import Navigation from './components/Navigation';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Profile from './pages/Profile';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Toaster position="top-right" />
          <Navigation />
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/register-technician" element={<RegisterTechnician />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/work"
              element={
                <ProtectedRoute>
                  <WorkManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles"
              element={
                <ProtectedRoute>
                  <VehicleManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/:vin"
              element={
                <ProtectedRoute>
                  <VehicleDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/works"
              element={
                <ProtectedRoute>
                  <WorkManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/register-technician" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
