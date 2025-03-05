const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensor');

// Сохранение данных с автомобиля
router.post('/sensor-data', sensorController.saveData);

// Получение состояния узлов
router.get('/health-status/:vehicleId', async (req, res) => {
  const { vehicleId } = req.params;
  
  // Логика расчета состояния
  const engineHealth = calculateEngineHealth(vehicleId);
  
  res.json({
    engine: engineHealth,
    oil: 85,
    tires: 92
  });
});

module.exports = router;