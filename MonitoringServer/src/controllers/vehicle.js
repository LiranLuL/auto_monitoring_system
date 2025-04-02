const Vehicle = require('../models/vehicle');

class VehicleController {
  static async searchVehicle(req, res) {
    try {
      const { query } = req.query;
      // Разделяем поисковый запрос на VIN и телефон владельца
      const searchParams = {
        vin: query,
        ownerPhone: query
      };
      const vehicles = await Vehicle.search(searchParams);
      res.json(vehicles);
    } catch (error) {
      console.error('Error searching vehicles:', error);
      res.status(500).json({ error: 'Failed to search vehicles' });
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
      const healthData = req.body;
      const vehicle = await Vehicle.saveHealthData(vehicleId, healthData);
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