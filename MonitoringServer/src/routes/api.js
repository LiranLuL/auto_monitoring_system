const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensor');
const auth = require('../middleware/auth');
const workController = require('../controllers/work');
const authController = require('../controllers/authController');
const vehicleController = require('../controllers/vehicle');

// Маршруты для техников
router.post('/elm327-data', 
  sensorController.saveData
);

router.get('/vehicle-health/:vehicleId', 
  auth.verifyToken, 
  sensorController.getVehicleHealth
);

router.get('/vehicles', 
  auth.verifyToken, 
  sensorController.getAllVehicles
);

// Маршруты только для администраторов
router.post('/predict', 
  auth.verifyToken, 
  auth.checkRole(['admin']), 
  sensorController.getPredictions
);

// Маршруты для работ
router.post('/works', auth.verifyToken, workController.createWork);
router.get('/works/vehicle/:vehicleId', auth.verifyToken, workController.getVehicleWorks);
router.get('/works/technician', auth.verifyToken, workController.getTechnicianWorks);
router.put('/works/:workId/status', auth.verifyToken, workController.updateWorkStatus);
router.get('/works/:workId', auth.verifyToken, workController.getWorkDetails);

// Маршруты аутентификации
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/user', auth.verifyToken, authController.getCurrentUser);

// Маршруты для автомобилей
router.get('/vehicles/search', auth.verifyToken, vehicleController.searchVehicle);
router.post('/vehicles', auth.verifyToken, vehicleController.createVehicle);
router.get('/vehicles', auth.verifyToken, vehicleController.getAllVehicles);
router.put('/vehicles/:id', auth.verifyToken, vehicleController.updateVehicle);
router.post('/vehicles/:vehicleId/health', auth.verifyToken, vehicleController.saveHealthData);

// Маршруты для датчиков
router.post('/elm327-data', auth.verifyToken, sensorController.saveData);
router.get('/vehicle-health/:vehicleId', auth.verifyToken, sensorController.getVehicleHealth);
router.post('/vehicles/:vehicleId/sensor-token', auth.verifyToken, sensorController.generateSensorToken);
router.get('/vehicles/vin/:vin/sensor-token', sensorController.getTokenByVin);

module.exports = router;