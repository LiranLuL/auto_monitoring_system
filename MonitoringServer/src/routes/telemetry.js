const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetryController');
const auth = require('../middleware/auth');

// Маршрут для сохранения телеметрических данных (требуется аутентификация)
router.post('/save', auth, telemetryController.saveTelemetry);

module.exports = router; 