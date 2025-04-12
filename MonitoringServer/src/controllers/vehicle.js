const Vehicle = require('../models/vehicle');

class VehicleController {
  static async searchVehicle(req, res) {
    try {
      // Получаем параметры из тела запроса вместо query
      const { vin, ownerPhone } = req.body;
      
      console.log('Searching vehicles with params:', { vin, ownerPhone });
      
      // Создаем объект с параметрами поиска
      const searchParams = {};
      
      if (vin) {
        searchParams.vin = vin;
      }
      
      if (ownerPhone) {
        searchParams.ownerPhone = ownerPhone;
      }
      
      // Выполняем поиск
      const vehicles = await Vehicle.search(searchParams);
      
      console.log(`Found ${vehicles.length} vehicles`);
      
      res.json(vehicles);
    } catch (error) {
      console.error('Error searching vehicles:', error);
      res.status(500).json({ error: 'Failed to search vehicles', details: error.message });
    }
  }

  static async createVehicle(req, res) {
    try {
      const vehicleData = req.body;
      const vehicle = await Vehicle.create(vehicleData);
      res.status(201).json(vehicle);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      res.status(500).json({ error: 'Failed to create vehicle' });
    }
  }

  static async getAllVehicles(req, res) {
    try {
      const vehicles = await Vehicle.findAll();
      res.json(vehicles);
    } catch (error) {
      console.error('Error getting vehicles:', error);
      res.status(500).json({ error: 'Failed to get vehicles' });
    }
  }

  static async saveHealthData(req, res) {
    try {
      const { vehicleId } = req.params;
      const { engineHealth, oilHealth, tiresHealth, brakesHealth } = req.body;
      
      // Преобразуем значения в числа с плавающей точкой
      const healthData = {
        vehicleId,
        engineHealth: parseFloat(engineHealth),
        oilHealth: parseFloat(oilHealth),
        tiresHealth: parseFloat(tiresHealth),
        brakesHealth: parseFloat(brakesHealth)
      };

      const vehicle = await Vehicle.saveHealthData(healthData);
      res.json(vehicle);
    } catch (error) {
      console.error('Error saving health data:', error);
      res.status(500).json({ error: 'Failed to save health data' });
    }
  }

  static async updateVehicle(req, res) {
    try {
      const { id } = req.params;
      const vehicleData = req.body;
      const vehicle = await Vehicle.update(id, vehicleData);
      res.json(vehicle);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      res.status(500).json({ error: 'Failed to update vehicle' });
    }
  }
}

module.exports = {
  searchVehicle: VehicleController.searchVehicle,
  createVehicle: VehicleController.createVehicle,
  getAllVehicles: VehicleController.getAllVehicles,
  saveHealthData: VehicleController.saveHealthData,
  updateVehicle: VehicleController.updateVehicle
}; 