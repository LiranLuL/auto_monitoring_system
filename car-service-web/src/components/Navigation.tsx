import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-800">AutoHealth</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {isAuthenticated && (
                <>
                  <Link
                    to="/dashboard"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/dashboard')
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Панель управления
                  </Link>
                  <Link
                    to="/work"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/work')
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Работы
                  </Link>
                  <Link
                    to="/vehicles"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/vehicles')
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Автомобили
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {isAuthenticated && user ? (
              <>
                <span className="text-gray-700 mr-4">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Выйти
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-gray-500 hover:text-gray-700"
              >
                Войти
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 