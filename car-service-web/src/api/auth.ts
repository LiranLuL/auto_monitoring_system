import axios from 'axios';
import { LoginCredentials, RegisterApiData, AuthResponse } from '../types/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Инициализируем интерцепторы
axios.interceptors.request.use(
  (config) => {
    console.log('Auth API request config:', config);
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Auth API request error:', error);
    return Promise.reject(error);
  }
);

// Обработка ошибок аутентификации
axios.interceptors.response.use(
  (response) => {
    console.log('Auth API response:', response);
    return response;
  },
  (error) => {
    console.error('Auth API response error:', error);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    console.log('Attempting login with:', credentials);
    console.log('Login API URL:', `${API_URL}/auth/login`);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      console.log('Login response:', response.data);
      
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        console.log('Token saved to localStorage');
      } else {
        console.warn('No token received in login response');
      }
      
      return response.data;
    } catch (error) {
      console.error('Login request failed:', error);
      throw error;
    }
  },

  register: async (data: RegisterApiData): Promise<AuthResponse> => {
    console.log('Attempting registration with:', data);
    const response = await axios.post(`${API_URL}/auth/register`, data);
    console.log('Registration response:', response.data);
    
    if (response.data && response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  },

  // Метод для регистрации механика
  registerTechnician: async (data: RegisterApiData): Promise<AuthResponse> => {
    console.log('Attempting technician registration with:', data);
    const response = await axios.post(`${API_URL}/auth/register-technician`, data);
    console.log('Technician registration response:', response.data);
    
    if (response.data && response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    console.log('Token removed from localStorage');
  },

  getCurrentUser: async (): Promise<AuthResponse> => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found when getting current user');
      throw new Error('No token found');
    }
    console.log('Getting current user with token');
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      console.log('Current user response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      localStorage.removeItem('token');
      throw error;
    }
  }
};

export default authApi; 