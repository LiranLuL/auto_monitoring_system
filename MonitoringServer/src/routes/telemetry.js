const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetryController');
const auth = require('../middleware/auth');

// Сохранение данных телеметрии
router.post('/', auth.verifyToken, (req, res) => {
  telemetryController.saveTelemetry(req.body, req.vin, req.role)
    .then(data => res.json(data))
    .catch(err => res.status(500).json(err));
});

module.exports = router; 