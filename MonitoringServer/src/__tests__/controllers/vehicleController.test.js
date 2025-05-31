const vehicleController = require('../../src/controllers/vehicle');
const Vehicle = require('../../src/models/vehicle');

jest.mock('../../src/models/vehicle');

describe('VehicleController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 1, role: 'user' }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('searchVehicle', () => {
    it('должен искать автомобили по VIN', async () => {
      req.body = { vin: 'TEST123' };
      const mockVehicles = [
        { id: '123e4567-e89b-12d3-a456-426614174000', vin: 'TEST123', make: 'Toyota' }
      ];
      Vehicle.search.mockResolvedValue(mockVehicles);

      await vehicleController.searchVehicle(req, res);

      expect(Vehicle.search).toHaveBeenCalledWith({ vin: 'TEST123' });
      expect(res.json).toHaveBeenCalledWith(mockVehicles);
    });

    it('должен искать автомобили по телефону владельца', async () => {
      req.body = { ownerPhone: '+79001234567' };
      const mockVehicles = [
        { id: '123e4567-e89b-12d3-a456-426614174000', ownerPhone: '+79001234567' }
      ];
      Vehicle.search.mockResolvedValue(mockVehicles);

      await vehicleController.searchVehicle(req, res);

      expect(Vehicle.search).toHaveBeenCalledWith({ ownerPhone: '+79001234567' });
      expect(res.json).toHaveBeenCalledWith(mockVehicles);
    });

    it('должен обрабатывать ошибки поиска', async () => {
      req.body = { vin: 'ERROR' };
      const error = new Error('Search failed');
      Vehicle.search.mockRejectedValue(error);

      await vehicleController.searchVehicle(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to search vehicles',
        details: error.message
      });
    });
  });

  describe('createVehicle', () => {
    it('должен создавать новый автомобиль', async () => {
      const vehicleData = {
        vin: 'NEWVIN123456789',
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        plateNumber: 'A123BC',
        ownerPhone: '+79001234567'
      };
      req.body = vehicleData;
      
      const mockCreatedVehicle = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...vehicleData
      };
      Vehicle.create.mockResolvedValue(mockCreatedVehicle);

      await vehicleController.createVehicle(req, res);

      expect(Vehicle.create).toHaveBeenCalledWith(vehicleData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCreatedVehicle);
    });

    it('должен обрабатывать ошибки при создании', async () => {
      req.body = { vin: 'INVALID' };
      const error = new Error('Validation failed');
      Vehicle.create.mockRejectedValue(error);

      await vehicleController.createVehicle(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to create vehicle'
      });
    });
  });

  describe('getVehicleById', () => {
    it('должен возвращать автомобиль по ID', async () => {
      const vehicleId = '123e4567-e89b-12d3-a456-426614174000';
      req.params = { vehicleId };
      
      const mockVehicle = {
        id: vehicleId,
        vin: 'TEST123',
        make: 'Toyota'
      };
      Vehicle.findById.mockResolvedValue(mockVehicle);

      await vehicleController.getVehicleById(req, res);

      expect(Vehicle.findById).toHaveBeenCalledWith(vehicleId);
      expect(res.json).toHaveBeenCalledWith(mockVehicle);
    });

    it('должен возвращать 404 если автомобиль не найден', async () => {
      req.params = { vehicleId: 'nonexistent' };
      Vehicle.findById.mockResolvedValue(null);

      await vehicleController.getVehicleById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Vehicle not found'
      });
    });
  });

  describe('saveHealthData', () => {
    it('должен сохранять данные о состоянии автомобиля', async () => {
      const vehicleId = '123e4567-e89b-12d3-a456-426614174000';
      const healthData = {
        engineHealth: '85.5',
        oilHealth: '92.3',
        tiresHealth: '88.0',
        brakesHealth: '79.5'
      };
      req.params = { vehicleId };
      req.body = healthData;
      
      const mockSavedData = {
        vehicleId,
        engineHealth: 85.5,
        oilHealth: 92.3,
        tiresHealth: 88.0,
        brakesHealth: 79.5
      };
      Vehicle.saveHealthData.mockResolvedValue(mockSavedData);

      await vehicleController.saveHealthData(req, res);

      expect(Vehicle.saveHealthData).toHaveBeenCalledWith({
        vehicleId,
        engineHealth: 85.5,
        oilHealth: 92.3,
        tiresHealth: 88.0,
        brakesHealth: 79.5
      });
      expect(res.json).toHaveBeenCalledWith(mockSavedData);
    });
  });

  describe('deleteVehicle', () => {
    it('должен удалять автомобиль', async () => {
      const vehicleId = '123e4567-e89b-12d3-a456-426614174000';
      req.params = { vehicleId };
      Vehicle.delete.mockResolvedValue({ id: vehicleId });

      await vehicleController.deleteVehicle(req, res);

      expect(Vehicle.delete).toHaveBeenCalledWith(vehicleId);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Vehicle deleted successfully'
      });
    });

    it('должен возвращать 404 если автомобиль не найден', async () => {
      req.params = { vehicleId: 'nonexistent' };
      Vehicle.delete.mockResolvedValue(null);

      await vehicleController.deleteVehicle(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Vehicle not found'
      });
    });
  });
});