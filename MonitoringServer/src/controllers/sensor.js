const sensorModel = require('../models/sensor');
const Vehicle = require('../models/vehicle');
const axios = require('axios');

exports.saveData = async (req, res) => {
  try {
    // Проверяем роль пользователя
    if (req.user.role !== 'technician') {
      return res.status(403).json({ error: 'Only technicians can save sensor data' });
    }

    const data = req.body;
    console.log('Received sensor data:', data);
    
    // Сохраняем данные сенсора
    const sensorResult = await sensorModel.saveSensorData(data);
    
    // Обновляем состояние автомобиля
    const healthData = await Vehicle.saveHealthData({
      vehicleId: data.vehicleId,
      engineHealth: calculateEngineHealth(data),
      oilHealth: calculateOilHealth(data),
      tiresHealth: calculateTiresHealth(data)
    });

    res.status(201).json({
      sensorData: sensorResult.rows[0],
      healthData
    });
  } catch (err) {
    console.error('Error saving sensor data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getVehicleHealth = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const healthStatus = await Vehicle.getHealthStatus(vehicleId);
    
    if (!healthStatus) {
      return res.status(404).json({ error: 'Vehicle health data not found' });
    }

    res.json(healthStatus);
  } catch (err) {
    console.error('Error getting vehicle health:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll();
    res.json(vehicles);
  } catch (err) {
    console.error('Error getting vehicles:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getPredictions = async (req, res) => {
  try {
    // Проверяем роль пользователя
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can access predictions' });
    }

    const response = await axios.post('http://localhost:5000/predict', {
      rpm: req.body.rpm,
      temperature: req.body.engineTemp
    });
    
    res.json(response.data);
  } catch (err) {
    console.error('Error getting predictions:', err);
    res.status(500).json({ error: 'Prediction service unavailable' });
  }
};

// Вспомогательные функции для расчета состояния
function calculateEngineHealth(data) {
  // Здесь должна быть логика расчета состояния двигателя
  // на основе данных сенсора
  return Math.min(100, Math.max(0, 85 + Math.random() * 10));
}

function calculateOilHealth(data) {
  // Здесь должна быть логика расчета состояния масла
  return Math.min(100, Math.max(0, 80 + Math.random() * 15));
}

function calculateTiresHealth(data) {
  // Здесь должна быть логика расчета состояния шин
  return Math.min(100, Math.max(0, 90 + Math.random() * 5));
}