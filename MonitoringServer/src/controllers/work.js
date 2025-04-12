const Work = require('../models/work');
const Vehicle = require('../models/vehicle');

class WorkController {
  static async createWork(req, res) {
    try {
      const { vehicleId, workType, description, partsUsed, cost, status } = req.body;
      const technicianId = req.user.id; // Получаем ID техника из JWT токена

      // Проверяем существование автомобиля
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      const work = await Work.create({
        vehicleId,
        technicianId,
        workType,
        description,
        partsUsed,
        cost,
        status
      });

      res.status(201).json(work);
    } catch (error) {
      console.error('Error creating work:', error);
      res.status(500).json({ error: 'Failed to create work record' });
    }
  }

  static async getVehicleWorks(req, res) {
    try {
      const { vehicleId } = req.params;
      // Проверяем, что vehicleId является валидным UUID
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleId)) {
        return res.status(400).json({ error: 'Invalid vehicle ID format' });
      }
      const works = await Work.getByVehicleId(vehicleId);
      res.json(works);
    } catch (error) {
      console.error('Error getting vehicle works:', error);
      res.status(500).json({ error: 'Failed to get vehicle works' });
    }
  }

  static async getTechnicianWorks(req, res) {
    try {
      const technicianId = req.user.id;
      const works = await Work.getByTechnicianId(technicianId);
      res.json(works);
    } catch (error) {
      console.error('Error getting technician works:', error);
      res.status(500).json({ error: 'Failed to get technician works' });
    }
  }

  static async updateWorkStatus(req, res) {
    try {
      const { workId } = req.params;
      const { status } = req.body;
      const technicianId = req.user.id;

      const work = await Work.getById(workId);
      if (!work) {
        return res.status(404).json({ error: 'Work not found' });
      }

      if (work.technicianId !== technicianId) {
        return res.status(403).json({ error: 'Not authorized to update this work' });
      }

      const updatedWork = await Work.updateStatus(workId, status);
      res.json(updatedWork);
    } catch (error) {
      console.error('Error updating work status:', error);
      res.status(500).json({ error: 'Failed to update work status' });
    }
  }

  static async getWorkDetails(req, res) {
    try {
      const { workId } = req.params;
      const work = await Work.getById(workId);
      
      if (!work) {
        return res.status(404).json({ error: 'Work not found' });
      }

      res.json(work);
    } catch (error) {
      console.error('Error getting work details:', error);
      res.status(500).json({ error: 'Failed to get work details' });
    }
  }
}

module.exports = {
  createWork: WorkController.createWork,
  getVehicleWorks: WorkController.getVehicleWorks,
  getTechnicianWorks: WorkController.getTechnicianWorks,
  updateWorkStatus: WorkController.updateWorkStatus,
  getWorkDetails: WorkController.getWorkDetails
}; 