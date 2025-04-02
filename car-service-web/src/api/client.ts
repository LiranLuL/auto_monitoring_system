import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// Добавляем перехватчик для добавления токена в заголовки
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Добавляем перехватчик для обработки ошибок авторизации
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Проверяем, не является ли это запросом проверки токена или получения данных пользователя
      if (!error.config.url?.includes('/verify-token') && 
          !error.config.url?.includes('/me') && 
          !error.config.url?.includes('/login')) {
        // Если это не запрос проверки токена, получения данных пользователя или логина,
        // удаляем токен и перенаправляем
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Метод для проверки валидности токена
export const verifyToken = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }
    const response = await API.get('/auth/verify-token');
    return response.data.valid;
  } catch (error) {
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
