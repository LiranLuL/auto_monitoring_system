import API from "../api/client";
import { MaintenanceRecord, Vehicle } from "../types/models";

export const fetchVehicles = async () => {
    const response = await API.get<Vehicle[]>("/vehicles");
    return response.data;
  };

export const updateMileage = (vin: string, mileage: number) => 
  API.patch(`/vehicles/${vin}`, { mileage });
export const fetchMaintenanceHistory = (vin: string) => 
  API.get<MaintenanceRecord[]>(`/maintenance/${vin}`);