const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Регистрация нового пользователя
router.post('/register', authController.register);

// Вход в систему
router.post('/login', authController.login);

// Получение данных текущего пользователя
router.get('/me', auth.verifyToken, authController.getCurrentUser);

// Эндпоинт для проверки токена
router.get('/verify-token', auth.verifyToken, (req, res) => {
  res.json({ valid: true });
});

module.exports = router; 