import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  useEffect(() => {
    console.log('ProtectedRoute - Auth state:', { 
      user, 
      isLoading, 
      isAuthenticated,
      token: localStorage.getItem('token') ? 'Present' : 'Missing'
    });
  }, [user, isLoading, isAuthenticated]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    console.log('ProtectedRoute - Redirecting to login: No user in context');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute - Access granted to:', user.username);
  return <>{children}</>;
};

export default ProtectedRoute; 