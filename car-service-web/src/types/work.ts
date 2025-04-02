import { Vehicle } from './models';

export interface Work {
  id: number;
  vehicle_id: string;
  technician_id: number;
  work_type: string;
  description: string;
  parts_used: string;
  cost: number;
  status: 'completed' | 'in_progress' | 'scheduled';
  created_at: string;
  completed_at: string | null;
  technician_name?: string;
  vehicle?: Vehicle;
}

export interface CreateWorkData {
  vehicleId: string;
  workType: string;
  description: string;
  partsUsed: string;
  cost: number;
  status?: 'completed' | 'in_progress' | 'scheduled';
}

export interface VehicleSearchParams {
  vin?: string;
  ownerPhone?: string;
} 