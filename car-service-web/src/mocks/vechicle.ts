import { Vehicle } from "../types/models";

export const mockVehicle: Vehicle = {
  id: "1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p",
  vin: "X9FMXXEEBMDM99785",
  model: "Toyota Camry 2020",
  mileage: 85430,
  lastServiceDate: "2024-03-15",
  healthStatus: {
    engine: 85,
    oil: 42,
    tires: 78,
    brakes: 65
  },
  make: "",
  plate_number: "",
  owner_phone: ""
};

// Для критического состояния
export const criticalVehicle: Vehicle = {
  ...mockVehicle,
  healthStatus: {
    engine: 22,
    oil: 15,
    tires: 38,
    brakes: 19
  }
};

// Для нового автомобиля
export const newVehicle: Vehicle = {
  ...mockVehicle,
  mileage: 1500,
  lastServiceDate: "2024-05-01",
  healthStatus: {
    engine: 98,
    oil: 95,
    tires: 99,
    brakes: 97
  }
};