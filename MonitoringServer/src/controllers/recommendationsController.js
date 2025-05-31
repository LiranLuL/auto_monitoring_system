const { pool } = require('../db');

/**
 * Генерирует эмулированные рекомендации на основе параметров автомобиля
 */
exports.generateRecommendations = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    
    console.log(`Generating recommendations for vehicle: ${vehicleId}`);
    
    // Проверяем, существует ли автомобиль
    let vehicle = null;
    try {
      const vehicleQuery = await pool.query(
        'SELECT * FROM user_vehicles WHERE id = $1',
        [vehicleId]
      );
      
      if (vehicleQuery.rows.length > 0) {
        vehicle = vehicleQuery.rows[0];
      }
    } catch (dbError) {
      console.log('Vehicle not found in database, will generate data based on vehicle ID');
      // Continue with generated data even if DB query fails
    }
    
    // Получаем последние телеметрические данные для автомобиля, если автомобиль существует
    let telemetry = null;
    if (vehicle) {
      try {
        const telemetryQuery = await pool.query(
          `SELECT * FROM telemetry_data 
           WHERE vehicle_id = $1 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [vehicleId]
        );
        
        if (telemetryQuery.rows.length > 0) {
          telemetry = telemetryQuery.rows[0];
        }
      } catch (dbError) {
        console.log('Telemetry data not found, will use calculated values');
      }
    }
    
    // Use vehicle ID to create deterministic randomness
    const seed = vehicleId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Add time-based component to make it change slightly on repeated calls
    const timeComponent = Math.floor(Date.now() / 60000) % 10; // Changes every minute
    const randomFactor = (seed % 15) - 7 + timeComponent - 5; // Random factor between -12 and +12
    
    // Генерируем показатели здоровья (используем реальные данные, если есть, с небольшой случайностью)
    const engineHealth = (telemetry?.engine_health || seed % 25 + 70) + randomFactor;
    const oilHealth = (telemetry?.oil_health || (seed * 2) % 30 + 65) + randomFactor;
    const tiresHealth = (telemetry?.tires_health || (seed * 3) % 25 + 70) + randomFactor;
    const brakesHealth = (telemetry?.brakes_health || (seed * 5) % 20 + 75) + randomFactor;
    const suspensionHealth = (seed * 7) % 25 + 70 + randomFactor; // Обычно нет в телеметрии
    const batteryHealth = (seed * 11) % 20 + 75 + randomFactor; // Обычно нет в телеметрии
    
    // Ensure values are within 0-100 range
    const normalizeValue = (value) => Math.max(0, Math.min(100, value));
    
    // Calculate overall health from normalized values
    const normalizedEngineHealth = normalizeValue(engineHealth);
    const normalizedOilHealth = normalizeValue(oilHealth);
    const normalizedTiresHealth = normalizeValue(tiresHealth);
    const normalizedBrakesHealth = normalizeValue(brakesHealth);
    const normalizedSuspensionHealth = normalizeValue(suspensionHealth);
    const normalizedBatteryHealth = normalizeValue(batteryHealth);
    
    const overallHealth = Math.floor(
      (normalizedEngineHealth + normalizedOilHealth + normalizedTiresHealth + 
       normalizedBrakesHealth + normalizedSuspensionHealth + normalizedBatteryHealth) / 6
    );
    
    // Генерируем рекомендации на основе показателей здоровья
    const recommendations = [];
    
    // Рекомендации для двигателя
    if (normalizedEngineHealth < 75) {
      recommendations.push("Срочно требуется диагностика двигателя. Наблюдаются признаки серьезного износа.");
    } else if (normalizedEngineHealth < 85) {
      recommendations.push("Рекомендуется диагностика двигателя. Обнаружены признаки износа.");
    }
    
    // Рекомендации для масла
    if (normalizedOilHealth < 70) {
      recommendations.push("Требуется срочная замена моторного масла и фильтра.");
    } else if (normalizedOilHealth < 80) {
      recommendations.push("Рекомендуется замена моторного масла при следующем ТО.");
    } else {
      recommendations.push("Рекомендуется регулярная проверка уровня масла.");
    }
    
    // Рекомендации для шин
    if (normalizedTiresHealth < 80) {
      recommendations.push("Требуется проверка давления в шинах и их состояния. Возможен неравномерный износ.");
    } else {
      recommendations.push("Проверьте давление в шинах при следующем ТО.");
    }
    
    // Рекомендации для тормозов
    if (normalizedBrakesHealth < 80) {
      recommendations.push("Рекомендуется проверка тормозной системы. Возможен износ колодок.");
    } else {
      recommendations.push("Регулярно проверяйте состояние тормозной системы.");
    }
    
    // Рекомендации для подвески
    if (normalizedSuspensionHealth < 80) {
      recommendations.push("Рекомендуется диагностика подвески. Возможны признаки износа амортизаторов.");
    }
    
    // Рекомендации для аккумулятора
    if (normalizedBatteryHealth < 80) {
      recommendations.push("Рекомендуется проверка аккумулятора. Возможно снижение емкости.");
    }
    
    // Добавим дополнительные рекомендации зависящие от VIN/ID
    const additionalRecommendations = [
      "Проверьте состояние воздушного фильтра при следующем ТО.",
      "Рекомендуется проверка уровня охлаждающей жидкости.",
      "Следите за уровнем жидкости в бачке омывателя.",
      "Рекомендуется проверка работы системы кондиционирования.",
      "Проверьте состояние щеток стеклоочистителя.",
      "Рекомендуется проверка и регулировка углов установки колес.",
      "Проверьте состояние приводных ремней.",
      "Рекомендуется замена салонного фильтра.",
      "Визуально осмотрите тормозные диски на наличие повреждений.",
      "Рекомендуется проверка состояния аккумуляторных клемм.",
      "Проверьте состояние и натяжение ремня генератора.",
      "Проверьте герметичность сальников и прокладок.",
      "Следите за расходом топлива - повышенный расход может указывать на проблемы."
    ];
    
    // Добавляем 1-3 дополнительные рекомендации на основе VIN
    const additionalCount = 1 + (seed % 3); // 1-3 recommendations based on vehicle ID
    for (let i = 0; i < additionalCount; i++) {
      const recIndex = (seed + i * 17) % additionalRecommendations.length;
      if (!recommendations.includes(additionalRecommendations[recIndex])) {
        recommendations.push(additionalRecommendations[recIndex]);
      }
    }
    
    // Создаем объект анализа
    const analysis = {
      vehicle_id: vehicleId,
      engine_health: normalizedEngineHealth,
      oil_health: normalizedOilHealth,
      tires_health: normalizedTiresHealth,
      brakes_health: normalizedBrakesHealth,
      suspension_health: normalizedSuspensionHealth,
      battery_health: normalizedBatteryHealth,
      overall_health: overallHealth,
      recommendations: recommendations,
      created_at: new Date().toISOString()
    };
    
    // Сохраняем анализ в базу данных
    try {
      const recommendationsStr = Array.isArray(recommendations) ? recommendations.join(',') : recommendations;
      
      const insertQuery = `
        INSERT INTO vehicle_analysis (
          vehicle_id, engine_health, oil_health, tires_health, brakes_health, 
          suspension_health, battery_health, overall_health, recommendations, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;
      
      const insertResult = await pool.query(insertQuery, [
        vehicleId, normalizedEngineHealth, normalizedOilHealth, normalizedTiresHealth, normalizedBrakesHealth,
        normalizedSuspensionHealth, normalizedBatteryHealth, overallHealth, recommendationsStr, new Date()
      ]);
      
      analysis.id = insertResult.rows[0].id;
      
      console.log(`Analysis data saved with ID: ${analysis.id}`);
    } catch (dbError) {
      console.error('Error saving analysis to database:', dbError);
      // Продолжаем выполнение даже при ошибке сохранения
    }
    
    // Возвращаем результат
    res.status(200).json({
      status: 'success',
      analysis: analysis
    });
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка при генерации рекомендаций',
      error: error.message
    });
  }
};

// Вспомогательная функция для генерации случайного целого числа в диапазоне [min, max]
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
} 