import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config';
import { Vehicle } from '../types/models';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const vehicleService = {
  // Поиск автомобиля
  async searchVehicle({ vin, ownerPhone }: { vin?: string; ownerPhone?: string }) {
    const response = await api.get(API_ENDPOINTS.vehicles.search, {
      params: { vin, ownerPhone }
    });
    return response.data;
  },

  // Создание нового автомобиля
  async createVehicle(vehicleData: Omit<Vehicle, 'id'>) {
    const response = await api.post(API_ENDPOINTS.vehicles.create, vehicleData);
    return response.data;
  },

  // Обновление данных автомобиля
  async updateVehicle(id: string, vehicleData: Partial<Vehicle>) {
    const response = await api.put(API_ENDPOINTS.vehicles.update(id), vehicleData);
    return response.data;
  },

  // Получение списка всех автомобилей
  async getAllVehicles() {
    const response = await api.get(API_ENDPOINTS.vehicles.getAll);
    return response.data;
  },

  // Получение данных о состоянии автомобиля
  async getVehicleHealth(vehicleId: string) {
    const response = await api.get(API_ENDPOINTS.vehicles.getHealth(vehicleId));
    return response.data;
  },

  // Сохранение данных о состоянии автомобиля
  async saveVehicleHealth(vehicleId: string, healthData: {
    engineHealth: number;
    oilHealth: number;
    tiresHealth: number;
    brakesHealth: number;
  }) {
    const response = await api.post(API_ENDPOINTS.vehicles.saveHealth(vehicleId), healthData);
    return response.data;
  }
}; 