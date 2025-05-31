const Vehicle = require('../models/vehicle');

class VehicleController {
  static async searchVehicle(req, res) {
    try {
      // Получаем параметры из тела запроса вместо query
      const { vin, ownerPhone } = req.body;
      console.log('Searching vehicles with params:', { vin, ownerPhone });
      const searchParams = {};
      if (vin) {
        searchParams.vin = vin;
      }
      if (ownerPhone) {
        searchParams.ownerPhone = ownerPhone;
      }
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

  static async getVehicleById(req, res) {
    try {
      const { vehicleId } = req.params;
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      console.error('Error getting vehicle by ID:', error);
      res.status(500).json({ error: 'Failed to get vehicle', details: error.message });
    }
  }

  static async deleteVehicle(req, res) {
    try {
      const { vehicleId } = req.params;
      const result = await Vehicle.delete(vehicleId);
      
      if (!result) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      
      res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      res.status(500).json({ error: 'Failed to delete vehicle', details: error.message });
    }
  }

  static async searchVehicleByOwner(req, res) {
    try {
      const { phone } = req.query;

      if (!phone) {
        return res.status(400).json({ error: 'Owner phone number is required' });
      }

      const vehicles = await Vehicle.searchByOwner(phone);
      res.json(vehicles);
    } catch (error) {
      console.error('Error searching vehicle by owner:', error);
      res.status(500).json({ error: 'Failed to search vehicle by owner', details: error.message });
    }
  }

  static async searchVehicleByVin(req, res) {
    try {
      const { vin } = req.query;
            
      if (!vin) {
        return res.status(400).json({ error: 'VIN is required' });
      }
      
      const vehicle = await Vehicle.searchByVin(vin);
      
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      
      res.json(vehicle);
    } catch (error) {
      console.error('Error searching vehicle by VIN:', error);
      res.status(500).json({ error: 'Failed to search vehicle by VIN', details: error.message });
    }
  }
}

module.exports = {
  searchVehicle: VehicleController.searchVehicle,
  createVehicle: VehicleController.createVehicle,
  getAllVehicles: VehicleController.getAllVehicles,
  saveHealthData: VehicleController.saveHealthData,
  updateVehicle: VehicleController.updateVehicle,
  getVehicleById: VehicleController.getVehicleById,
  deleteVehicle: VehicleController.deleteVehicle,
  searchVehicleByOwner: VehicleController.searchVehicleByOwner,
  searchVehicleByVin: VehicleController.searchVehicleByVin
}; 