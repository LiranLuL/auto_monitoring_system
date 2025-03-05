export interface Vehicle {
    id: string;
    vin: string;
    model: string;
    mileage: number;
    lastServiceDate: string;
    healthStatus: {
      engine: number;
      oil: number;
      tires: number;
      brakes: number;
    };
  }
  
  export interface MaintenanceRecord {
    id: string;
    vehicleId: string;
    type: string;
    date: string;
    cost: number;
  }