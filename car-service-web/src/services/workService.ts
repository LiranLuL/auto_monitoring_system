import API from '../api/client';
import { Work, CreateWorkData, VehicleSearchParams } from '../types/work';
import { API_ENDPOINTS } from '../config';

const workService = {
  async createWork(data: CreateWorkData): Promise<Work> {
    const response = await API.post(API_ENDPOINTS.works.create, data);
    return response.data;
  },

  async getVehicleWorks(vehicleId: string): Promise<Work[]> {
    if (!vehicleId) {
      console.error('Vehicle ID is required');
      return [];
    }
    try {
      const response = await API.get(API_ENDPOINTS.works.getVehicleWorks(vehicleId));
      return response.data;
    } catch (error) {
      console.error('Error fetching vehicle works:', error);
      return [];
    }
  },

  async getTechnicianWorks(): Promise<Work[]> {
    const response = await API.get(API_ENDPOINTS.works.getTechnicianWorks);
    return response.data;
  },

  async updateWorkStatus(workId: string, status: Work['status']): Promise<Work> {
    const response = await API.patch(
      API_ENDPOINTS.works.updateStatus(workId),
      { status }
    );
    return response.data;
  },

  async getWorkDetails(workId: string): Promise<Work> {
    const response = await API.get(API_ENDPOINTS.works.getDetails(workId));
    return response.data;
  },

  async searchVehicle(params: VehicleSearchParams): Promise<Work[]> {
    const response = await API.get(API_ENDPOINTS.works.search, { params });
    return response.data;
  }
};

export default workService; 