import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authApi from '../api/auth';
import { verifyToken } from '../api/client';
import { User, LoginCredentials, RegisterFormData, RegisterApiData } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  registerTechnician: (data: RegisterFormData) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Выносим получение данных пользователя в отдельную функцию, которую можно использовать повторно
  const refreshUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('refreshUserData: No token found');
        setUser(null);
        return null;
      }

      console.log('refreshUserData: Loading user data...');
      const userData = await authApi.getCurrentUser();
      console.log('refreshUserData: User data loaded:', userData);
      
      if (userData && userData.user) {
        setUser(userData.user);
        return userData.user;
      } else {
        console.warn('refreshUserData: Received empty user data');
        setUser(null);
        return null;
      }
    } catch (err) {
      console.error('refreshUserData: Error loading user data:', err);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('AuthContext: Initializing authentication...');
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('AuthContext: No token found during initialization');
          setUser(null);
          setIsLoading(false);
          return;
        }

        console.log('AuthContext: Verifying token...');
        const isValid = await verifyToken();
        console.log('AuthContext: Token valid?', isValid);
        
        if (isValid) {
          await refreshUserData();
        } else {
          console.log('AuthContext: Invalid token, clearing user state');
          setUser(null);
          localStorage.removeItem('token');
        }
      } catch (err) {
        console.error('AuthContext: Initialization error:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshUserData]);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('AuthContext: Attempting login with credentials:', credentials);
      const response = await authApi.login(credentials);
      
      // Сохраняем токен в localStorage
      if (response.token) {
        console.log('AuthContext: Login successful, token received');
        localStorage.setItem('token', response.token);
        
        // После успешного входа получаем данные пользователя
        const userData = await refreshUserData();
        if (!userData) {
          console.error('AuthContext: Failed to load user data after login');
          
          // Если не удалось получить данные через refreshUserData, используем данные из ответа
          if (response.user) {
            console.log('AuthContext: Using user data from login response');
            setUser(response.user);
            return;
          }
          
          throw new Error('Failed to load user data');
        }
      } else {
        console.error('AuthContext: No token in login response');
        throw new Error('No token received from server');
      }
    } catch (err: any) {
      console.error('AuthContext: Login error:', err);
      setError(err.response?.data?.message || 'Login failed');
      localStorage.removeItem('token');
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (formData: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('AuthContext: Attempting registration with data:', formData);
      
      // Преобразуем данные формы в формат для API
      const apiData: RegisterApiData = {
        username: formData.username,
        email: formData.email,
        password: formData.password
      };
      
      const response = await authApi.register(apiData);
      console.log('AuthContext: Registration response:', response);
      
      // Сохраняем токен в localStorage
      if (response.token) {
        console.log('AuthContext: Registration successful, token received');
        localStorage.setItem('token', response.token);
        
        // После успешной регистрации получаем данные пользователя
        const userData = await refreshUserData();
        if (!userData) {
          console.error('AuthContext: Failed to load user data after registration');
          
          // Если не удалось получить данные через refreshUserData, используем данные из ответа
          if (response.user) {
            console.log('AuthContext: Using user data from registration response');
            setUser(response.user);
            return;
          }
          
          throw new Error('Failed to load user data');
        }
      } else {
        console.error('AuthContext: No token in registration response');
        throw new Error('No token received from server');
      }
    } catch (err: any) {
      console.error('AuthContext: Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed');
      localStorage.removeItem('token');
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const registerTechnician = async (formData: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('AuthContext: Attempting technician registration with data:', formData);
      
      // Преобразуем данные формы в формат для API
      const apiData: RegisterApiData = {
        username: formData.username,
        email: formData.email,
        password: formData.password
      };
      
      const response = await authApi.registerTechnician(apiData);
      console.log('AuthContext: Technician registration response:', response);
      
      // Сохраняем токен в localStorage
      if (response.token) {
        console.log('AuthContext: Technician registration successful, token received');
        localStorage.setItem('token', response.token);
        
        // После успешной регистрации получаем данные пользователя
        const userData = await refreshUserData();
        if (!userData) {
          console.error('AuthContext: Failed to load user data after technician registration');
          
          // Если не удалось получить данные через refreshUserData, используем данные из ответа
          if (response.user) {
            console.log('AuthContext: Using user data from registration response');
            setUser(response.user);
            return;
          }
          
          throw new Error('Failed to load user data');
        }
      } else {
        console.error('AuthContext: No token in technician registration response');
        throw new Error('No token received from server');
      }
    } catch (err: any) {
      console.error('AuthContext: Technician registration error:', err);
      setError(err.response?.data?.message || 'Technician registration failed');
      localStorage.removeItem('token');
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('AuthContext: Logging out');
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    registerTechnician,
    logout,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 