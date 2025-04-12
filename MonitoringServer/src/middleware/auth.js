const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

module.exports = async (req, res, next) => {
  try {
    // Получаем токен из заголовка
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Требуется авторизация' });
    }
    
    console.log('Processing token:', token);
    
    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token payload:', decoded);
    
    // Находим пользователя
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }
    
    // Добавляем информацию о пользователе в запрос
    req.user = user;
    req.token = token;
    
    console.log('Request context:', { userId: user.id, vin: user.vehicles && user.vehicles.length > 0 ? user.vehicles[0].vin : null, role: user.role });
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Ошибка авторизации', error: error.message });
  }
}; 