const User = require('../models/user');

const authController = {
  register: async (req, res) => {
    try {
      const { email, password, vin, username } = req.body;
      
      console.log('Registration request:', { email, username, hasVin: !!vin });
      
      // Проверяем, что email уникальный
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      
      // Создаем нового пользователя с ролью 'user'
      const newUser = await User.create({ email, password, username, vin, role: 'user' });
      console.log('New user created:', { 
        id: newUser.id, 
        email: newUser.email,
        username: newUser.username,
        role: newUser.role 
      });
      
      // Для отладки: получаем пользователя после создания, чтобы проверить VIN
      const createdUser = await User.findById(newUser.id);
      console.log('User after creation with vehicles:', {
        id: createdUser.id,
        email: createdUser.email,
        username: createdUser.username,
        vehicles: createdUser.vehicles,
      });
      
      // Генерируем JWT токен
      const token = User.generateToken(Object.assign(createdUser, { vin: vin }));
      
      // Проверяем содержимое токена
      const decodedToken = require('jsonwebtoken').decode(token);
      console.log('Generated token payload for new user:', decodedToken);
      
      // Возвращаем токен
      res.status(201).json({ token });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Новый метод для регистрации механиков
  registerTechnician: async (req, res) => {
    try {
      const { email, password, username } = req.body;
      
      // Проверяем, что email уникальный
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      
      // Создаем нового пользователя с ролью 'technician'
      const newUser = await User.create({ email, password, username, role: 'technician' });
      
      // Генерируем JWT токен
      const token = User.generateToken(newUser);
      
      // Возвращаем токен
      res.status(201).json({ token });
    } catch (error) {
      console.error('Technician registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password, username } = req.body;
      
      let user;
      // Если передан email, ищем по нему, иначе по username
      if (email) {
        user = await User.findByEmail(email);
      } else if (username) {
        user = await User.findByUsername(username);
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Проверяем пароль
      const isMatch = await User.verifyPassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      console.log('User authenticated:', {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        vehicles: user.vehicles
      });
      
      // Генерируем JWT токен
      const token = User.generateToken(user);
      
      // Проверяем содержимое токена
      const decodedToken = require('jsonwebtoken').decode(token);
      console.log('Generated token payload:', decodedToken);
      
      res.json({ token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getCurrentUser: async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        vin: user.vehicles && user.vehicles[0] !== null ? user.vehicles[0] : null
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = authController; 