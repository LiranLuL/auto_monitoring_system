const workController = require('../../src/controllers/work');
const Work = require('../../src/models/work');
const Vehicle = require('../../src/models/vehicle');

jest.mock('../../src/models/work');
jest.mock('../../src/models/vehicle');

describe('WorkController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      body: {},
      params: {},
      user: { id: 1, role: 'technician' }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createWork', () => {
    it('должен создавать новую запись о работе', async () => {
      const workData = {
        vehicleId: '123e4567-e89b-12d3-a456-426614174000',
        workType: 'Замена масла',
        description: 'Замена моторного масла и фильтра',
        partsUsed: 'Масло 5W-30 - 4л, Фильтр масляный',
        cost: 3500,
        status: 'completed'
      };
      
      req.body = workData;
      
      const mockVehicle = { id: workData.vehicleId, vin: 'TEST123' };
      const mockWork = {
        id: 1,
        ...workData,
        technicianId: req.user.id,
        createdAt: new Date()
      };
      
      Vehicle.findById.mockResolvedValue(mockVehicle);
      Work.create.mockResolvedValue(mockWork);

      await workController.createWork(req, res);

      expect(Vehicle.findById).toHaveBeenCalledWith(workData.vehicleId);
      expect(Work.create).toHaveBeenCalledWith({
        ...workData,
        technicianId: req.user.id
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockWork);
    });

    it('должен возвращать 404 если автомобиль не найден', async () => {
      req.body = {
        vehicleId: 'nonexistent',
        workType: 'Диагностика'
      };
      
      Vehicle.findById.mockResolvedValue(null);

      await workController.createWork(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Vehicle not found' });
    });
  });

  describe('getVehicleWorks', () => {
    it('должен возвращать список работ для автомобиля', async () => {
      const vehicleId = '123e4567-e89b-12d3-a456-426614174000';
      req.params = { vehicleId };
      
      const mockWorks = [
        {
          id: 1,
          vehicleId,
          workType: 'Замена масла',
          status: 'completed',
          createdAt: '2024-01-01'
        },
        {
          id: 2,
          vehicleId,
          workType: 'Диагностика',
          status: 'completed',
          createdAt: '2024-01-15'
        }
      ];
      
      Work.getByVehicleId.mockResolvedValue(mockWorks);

      await workController.getVehicleWorks(req, res);

      expect(Work.getByVehicleId).toHaveBeenCalledWith(vehicleId);
      expect(res.json).toHaveBeenCalledWith(mockWorks);
    });

    it('должен отклонять невалидный формат UUID', async () => {
      req.params = { vehicleId: 'invalid-uuid' };

      await workController.getVehicleWorks(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid vehicle ID format' });
    });
  });

  describe('getTechnicianWorks', () => {
    it('должен возвращать работы текущего техника', async () => {
      const mockWorks = [
        {
          id: 1,
          technicianId: 1,
          workType: 'Замена тормозных колодок',
          vehiclePlateNumber: 'A123BC'
        }
      ];
      
      Work.getByTechnicianId.mockResolvedValue(mockWorks);

      await workController.getTechnicianWorks(req, res);

      expect(Work.getByTechnicianId).toHaveBeenCalledWith(req.user.id);
      expect(res.json).toHaveBeenCalledWith(mockWorks);
    });
  });

  describe('updateWorkStatus', () => {
    it('должен обновлять статус работы', async () => {
      const workId = 1;
      req.params = { workId };
      req.body = { status: 'completed' };
      
      const mockWork = {
        id: workId,
        technicianId: req.user.id,
        status: 'in_progress'
      };
      
      const updatedWork = {
        ...mockWork,
        status: 'completed',
        completedAt: new Date()
      };
      
      Work.getById.mockResolvedValue(mockWork);
      Work.updateStatus.mockResolvedValue(updatedWork);

      await workController.updateWorkStatus(req, res);

      expect(Work.getById).toHaveBeenCalledWith(workId);
      expect(Work.updateStatus).toHaveBeenCalledWith(workId, 'completed');
      expect(res.json).toHaveBeenCalledWith(updatedWork);
    });

    it('должен отклонять обновление чужой работы', async () => {
      req.params = { workId: 1 };
      req.body = { status: 'completed' };
      
      const mockWork = {
        id: 1,
        technicianId: 999
      };
      
      Work.getById.mockResolvedValue(mockWork);

      await workController.updateWorkStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not authorized to update this work'
      });
    });

    it('должен возвращать 404 если работа не найдена', async () => {
      req.params = { workId: 999 };
      Work.getById.mockResolvedValue(null);

      await workController.updateWorkStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Work not found' });
    });
  });
});