export interface Vehicle {
    id: string;
    vin: string;
    make: string;
    model: string;
    plate_number: string;
    owner_phone: string;
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