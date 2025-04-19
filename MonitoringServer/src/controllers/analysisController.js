const axios = require('axios');
const { pool } = require('../db');
const Vehicle = require('../models/vehicle');
require('dotenv').config();

// URL to the predictive analysis service
const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || 'http://localhost:5001';
const API_TOKEN = process.env.ANALYSIS_API_TOKEN || 'your_secret_token_here';

/**
 * Запрос анализа для указанного автомобиля
 */
exports.requestAnalysis = async (req, res) => {
  const { vehicleId } = req.params;
  const { id: userId, role } = req.user;

  try {
    // Проверяем, есть ли у пользователя доступ к этому автомобилю
    const hasAccess = await Vehicle.checkUserVehicleAccess(userId, vehicleId, role);
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'У вас нет доступа к этому автомобилю' });
    }

    // Отправляем запрос к сервису анализа
    const response = await axios.post(
      `${ANALYSIS_SERVICE_URL}/analyze/${vehicleId}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`
        }
      }
    );

    // Если анализ успешно выполнен
    if (response.data.status === 'success') {
      res.status(200).json({
        message: 'Анализ успешно выполнен',
        results: response.data.results
      });
    } else {
      res.status(200).json({
        message: response.data.message,
        warning: true
      });
    }
  } catch (error) {
    console.error('Ошибка при запросе анализа:', error.message);
    res.status(500).json({ message: 'Ошибка при запросе анализа' });
  }
};

/**
 * Получение последнего анализа для автомобиля
 */
exports.getLatestAnalysis = async (req, res) => {
  const { vehicleId } = req.params;
  const { id: userId, role } = req.user;

  try {
    // Проверяем, есть ли у пользователя доступ к этому автомобилю
    const hasAccess = await Vehicle.checkUserVehicleAccess(userId, vehicleId, role);
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'У вас нет доступа к этому автомобилю' });
    }

    // Отправляем запрос на получение последнего анализа
    const response = await axios.get(
      `${ANALYSIS_SERVICE_URL}/analysis/latest/${vehicleId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`
        }
      }
    );

    // Если анализ найден
    if (response.data.status === 'success') {
      res.status(200).json({
        analysis: response.data.analysis
      });
    } else {
      res.status(404).json({
        message: 'Анализ не найден для данного автомобиля'
      });
    }
  } catch (error) {
    console.error('Ошибка при получении анализа:', error.message);
    res.status(500).json({ message: 'Ошибка при получении анализа' });
  }
};

/**
 * Получение истории анализов для автомобиля
 */
exports.getAnalysisHistory = async (req, res) => {
  const { vehicleId } = req.params;
  const { id: userId, role } = req.user;

  try {
    // Проверяем, есть ли у пользователя доступ к этому автомобилю
    const hasAccess = await Vehicle.checkUserVehicleAccess(userId, vehicleId, role);
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'У вас нет доступа к этому автомобилю' });
    }

    // Отправляем запрос на получение истории анализов
    const response = await axios.get(
      `${ANALYSIS_SERVICE_URL}/analysis/history/${vehicleId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`
        }
      }
    );

    // Если история найдена
    if (response.data.status === 'success') {
      res.status(200).json({
        history: response.data.history
      });
    } else {
      res.status(404).json({
        message: 'История анализов не найдена для данного автомобиля'
      });
    }
  } catch (error) {
    console.error('Ошибка при получении истории анализов:', error.message);
    res.status(500).json({ message: 'Ошибка при получении истории анализов' });
  }
};

/**
 * Запуск полного анализа всех автомобилей (только для администраторов)
 */
exports.runFullAnalysis = async (req, res) => {
  const { role } = req.user;

  // Только администраторы могут запускать полный анализ
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Недостаточно прав для выполнения этой операции' });
  }

  try {
    // Отправляем запрос на полный анализ всех автомобилей
    const response = await axios.post(
      `${ANALYSIS_SERVICE_URL}/analyze`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`
        }
      }
    );

    // Если анализ успешно выполнен
    if (response.data.status === 'success') {
      res.status(200).json({
        message: response.data.message,
        count: response.data.results ? response.data.results.length : 0
      });
    } else {
      res.status(200).json({
        message: response.data.message,
        warning: true
      });
    }
  } catch (error) {
    console.error('Ошибка при запуске полного анализа:', error.message);
    res.status(500).json({ message: 'Ошибка при запуске полного анализа' });
  }
}; 