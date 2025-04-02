// API Configuration
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// API Client Configuration
export const API_TIMEOUT = 10000; // 10 seconds

// Auth Configuration
export const TOKEN_KEY = 'token';

// API Endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    user: '/auth/user'
  },
  works: {
    create: '/works',
    getVehicleWorks: (vehicleId: string) => `/works/vehicle/${vehicleId}`,
    getTechnicianWorks: '/works/technician',
    updateStatus: (workId: string) => `/works/${workId}/status`,
    getDetails: (workId: string) => `/works/${workId}`,
    search: '/works/search'
  },
  vehicles: {
    create: '/vehicles',
    search: '/vehicles/search',
    getAll: '/vehicles',
    getDetails: (vin: string) => `/vehicles/${vin}`,
    update: (id: string) => `/vehicles/${id}`,
    getHealth: (vehicleId: string) => `/vehicles/${vehicleId}/health`,
    saveHealth: (vehicleId: string) => `/vehicles/${vehicleId}/health`,
    data: '/elm327-data'
  }
}; 