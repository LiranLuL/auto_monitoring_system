const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensor');
const auth = require('../middleware/auth');
const workController = require('../controllers/work');
const authController = require('../controllers/authController');
const vehicleController = require('../controllers/vehicle');
const telemetryController = require('../controllers/telemetryController');
const userController = require('../controllers/userController');
const analysisController = require('../controllers/analysisController');

// Маршруты для техников
router.post('/elm327-data', 
  sensorController.saveData
);

router.get('/vehicle-health/:vehicleId', 
  auth, 
  sensorController.getVehicleHealth
);

router.get('/vehicles', 
  auth, 
  sensorController.getAllVehicles
);

// Маршруты только для администраторов
router.post('/predict', 
  auth, 
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора.' });
    }
    next();
  }, 
  sensorController.getPredictions
);

// Маршруты для работ
router.post('/works', auth, workController.createWork);
router.get('/works/vehicle/:vehicleId', auth, workController.getVehicleWorks);
router.get('/works/technician', auth, workController.getTechnicianWorks);
router.put('/works/:workId/status', auth, workController.updateWorkStatus);
router.get('/works/:workId', auth, workController.getWorkDetails);

// Маршруты аутентификации
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/user', auth, authController.getCurrentUser);

// Маршруты для автомобилей
router.post('/vehicles/search', auth, vehicleController.searchVehicle);
router.post('/vehicles', auth, vehicleController.createVehicle);
router.get('/vehicles', auth, vehicleController.getAllVehicles);
router.put('/vehicles/:id', auth, vehicleController.updateVehicle);
router.post('/vehicles/:vehicleId/health', auth, vehicleController.saveHealthData);

// Маршруты для датчиков
router.post('/elm327-data', auth, sensorController.saveData);
router.get('/vehicle-health/:vehicleId', auth, sensorController.getVehicleHealth);
router.post('/vehicles/:vehicleId/sensor-token', auth, sensorController.generateSensorToken);
router.get('/vehicles/vin/:vin/sensor-token', sensorController.getTokenByVin);

// Маршрут для получения телеметрических данных (требуется аутентификация)
router.get('/telemetry', auth, telemetryController.getTelemetry);

// Маршрут для сохранения телеметрических данных (требуется аутентификация)
router.post('/telemetry', auth, telemetryController.saveTelemetry);

// Маршруты пользователя
router.get('/profile', auth, userController.getUserProfile);
router.put('/profile', auth, userController.updateUserProfile);
router.delete('/profile', auth, userController.deleteUserProfile);

// Маршруты автомобилей
router.get('/vehicles/:vehicleId', auth, vehicleController.getVehicleById);
router.delete('/vehicles/:vehicleId', auth, vehicleController.deleteVehicle);
router.get('/vehicles/search/by-owner', auth, vehicleController.searchVehicleByOwner);
router.get('/vehicles/search/by-vin', auth, vehicleController.searchVehicleByVin);

// Маршруты предиктивного анализа
router.post('/analysis/vehicle/:vehicleId/analyze', auth, analysisController.requestAnalysis);
router.get('/analysis/vehicle/:vehicleId/latest', auth, analysisController.getLatestAnalysis);
router.get('/analysis/vehicle/:vehicleId/history', auth, analysisController.getAnalysisHistory);
router.post('/analysis/full', auth, analysisController.runFullAnalysis);

module.exports = router;