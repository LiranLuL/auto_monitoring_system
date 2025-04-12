const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Маршрут для регистрации нового пользователя
router.post('/register', authController.register);

// Маршрут для регистрации техника
router.post('/register-technician', authController.registerTechnician);

// Маршрут для входа пользователя
router.post('/login', authController.login);

// Маршрут для получения информации о текущем пользователе (требуется аутентификация)
router.get('/me', auth, authController.getCurrentUser);

module.exports = router; 