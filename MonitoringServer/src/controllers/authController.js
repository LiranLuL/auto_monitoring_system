const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
require('dotenv').config();


const authController = {
  register: async (req, res) => {
    try {
      const { email, username, password, vin } = req.body;
      console.log("Registration request:", { email, username, vin: !!vin });

      // Проверяем, существует ли пользователь с таким email
      const existingUser = await User.findByEmail(email);
      console.log(existingUsername);

      if (existingUser) {
        return res.status(400).json({ message: "Пользователь с таким email уже существует" });
      }

      // Проверяем, существует ли пользователь с таким username
      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Пользователь с таким именем уже существует" });
      }

      // Создаем нового пользователя
      const user = await User.create({ email, username, password, vin });
      console.log("User created:", { id: user.id, email: user.email, username: user.username, role: user.role });

      // Получаем пользователя с его vehicles
      const createdUser = await User.findById(user.id);
      console.log("Created user with vehicles:", { id: createdUser.id, email: createdUser.email, vehicles: createdUser.vehicles });

      // Генерируем JWT токен
      const token = jwt.sign(
        { id: createdUser.id, email: createdUser.email, role: createdUser.role },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Логируем декодированный токен для проверки
      const decodedToken = jwt.decode(token);
      console.log("Generated token payload:", decodedToken);

      res.status(201).json({
        message: "Пользователь успешно зарегистрирован",
        token,
        user: {
          id: createdUser.id,
          email: createdUser.email,
          username: createdUser.username,
          role: createdUser.role,
          vehicles: createdUser.vehicles,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Ошибка при регистрации пользователя", error: error.message });
    }
  },

  // Новый метод для регистрации механиков
  registerTechnician: async (req, res) => {
    try {
      const { email, username, password } = req.body;

      console.log("Technician registration request:", { email, username });

      // Проверяем, существует ли пользователь с таким email
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Пользователь с таким email уже существует" });
      }

      // Проверяем, существует ли пользователь с таким username
      const existingUsername = await User.findByUsername(username);
      console.log(existingUsername);
      if (existingUsername) {
        return res.status(400).json({ message: "Пользователь с таким именем уже существует" });
      }

      // Создаем нового пользователя с ролью 'technician'
      const user = await User.create({ email, username, password, role: "technician" });
      console.log("Technician created:", { id: user.id, email: user.email, username: user.username, role: user.role });

      // Получаем пользователя
      const createdUser = await User.findById(user.id);
      console.log("Created technician:", { id: createdUser.id, email: createdUser.email, role: createdUser.role });
      console.log(process.env.JWT_SECRET)
      // Генерируем JWT токен
      const token = jwt.sign(
        { id: createdUser.id, email: createdUser.email, role: createdUser.role },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Логируем декодированный токен для проверки
      const decodedToken = jwt.decode(token);
      console.log("Generated token payload:", decodedToken);

      res.status(201).json({
        message: "Техник успешно зарегистрирован",
        token,
        user: {
          id: createdUser.id,
          email: createdUser.email,
          username: createdUser.username,
          role: createdUser.role,
        },
      });
    } catch (error) {
      console.error("Technician registration error:", error);
      res.status(500).json({ message: "Ошибка при регистрации техника", error: error.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("Login request:", { email });

      // Находим пользователя по email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Неверный email или пароль" });
      }

      // Проверяем пароль
      const isPasswordValid = await User.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Неверный email или пароль" });
      }

      // Получаем пользователя с его vehicles
      const userWithVehicles = await User.findById(user.id);
      console.log("User authentication details:", {
        id: userWithVehicles.id,
        email: userWithVehicles.email,
        username: userWithVehicles.username,
        role: userWithVehicles.role,
        vehicles: userWithVehicles.vehicles,
      });

      // Генерируем JWT токен
      const token = jwt.sign(
        { id: userWithVehicles.id, email: userWithVehicles.email, role: userWithVehicles.role },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Логируем декодированный токен для проверки
      const decodedToken = jwt.decode(token);
      console.log("Generated token payload:", decodedToken);

      res.json({
        message: "Успешный вход в систему",
        token,
        user: {
          id: userWithVehicles.id,
          email: userWithVehicles.email,
          username: userWithVehicles.username,
          role: userWithVehicles.role,
          vehicles: userWithVehicles.vehicles,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Ошибка при входе в систему", error: error.message });
    }
  },

  getCurrentUser: async (req, res) => {
    try {
      const userId = req.user.id;

      // Получаем пользователя с его vehicles
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          vehicles: user.vehicles || []
        }
      });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ message: "Ошибка при получении данных пользователя", error: error.message });
    }
  },
};

module.exports = authController;
