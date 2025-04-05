import axios from 'axios';

// Используем более конкретный URL
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
console.log('API Client baseURL:', baseURL);

const API = axios.create({
  baseURL,
  timeout: 10000,
});

// Добавляем перехватчик для добавления токена в заголовки
API.interceptors.request.use(
  (config) => {
    console.log('API request to:', config.url);
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Token found, adding to headers');
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log('No token found');
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Добавляем перехватчик для обработки ошибок авторизации
API.interceptors.response.use(
  (response) => {
    console.log('API response from:', response.config.url, 'status:', response.status);
    console.log('Response data:', response.data);
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      
      if (error.response.status === 401) {
        // Проверяем, не является ли это запросом проверки токена или получения данных пользователя
        if (!error.config.url?.includes('/verify-token') && 
            !error.config.url?.includes('/me') && 
            !error.config.url?.includes('/login')) {
          // Если это не запрос проверки токена, получения данных пользователя или логина,
          // удаляем токен и перенаправляем
          console.log('Unauthorized error, removing token and redirecting');
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Метод для проверки валидности токена
export const verifyToken = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('verifyToken: No token found in localStorage');
    return false;
  }
  
  try {
    console.log('verifyToken: Verifying token...');
    // Здесь обновляем URL для соответствия API с поддержкой проверки токена
    const response = await axios.get('http://localhost:5000/auth/verify-token', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('verifyToken: Token verification response:', response.data);
    return response.data.valid || false;
  } catch (error: any) {
    console.error('verifyToken: Error verifying token:', error.message);
    if (error.response) {
      console.error('verifyToken: Server response:', error.response.status, error.response.data);
    }
    // В случае ошибки считаем токен невалидным
    return false;
  }
};

export const fetchVehicleHealth = async (vehicleId: string) => {
  try {
    const response = await API.get(`/vehicle-health/${vehicleId}`);
    return response.data;
  } catch (error) {
    throw new Error('Ошибка получения данных о состоянии');
  }
};

export const sendVehicleData = async (data: object) => {
  try {
    const response = await API.post('/elm327-data', data);
    return response.data;
  } catch (error) {
    throw new Error('Ошибка отправки данных');
  }
};

export default API;
