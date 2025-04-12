const db = require('../db');

exports.saveTelemetry = async (req, res) => {
  try {
    const { data } = req.body;
    const { vin } = req.user.vehicles && req.user.vehicles.length > 0 ? req.user.vehicles[0] : null;
    const { role } = req.user;
    
    console.log('Saving telemetry data:', { data, vin, role });
    
    // Проверяем, что пользователь имеет роль 'user'
    if (role !== 'user') {
      return res.status(403).json({ message: 'Доступ запрещен. Только пользователи могут отправлять телеметрию.' });
    }
    
    // Проверяем наличие VIN
    if (!vin) {
      console.error('VIN not found in token');
      return res.status(400).json({ message: 'VIN не найден в токене. Пожалуйста, зарегистрируйте автомобиль.' });
    }
    
    // Проверяем существование автомобиля в базе данных
    const vehicleResult = await db.query(
      'SELECT id FROM user_vehicles WHERE vin = $1',
      [vin]
    );
    
    if (vehicleResult.rows.length === 0) {
      console.error('Vehicle not found in database:', vin);
      return res.status(404).json({ message: 'Автомобиль не найден в базе данных.' });
    }
    
    console.log('Vehicle found in database:', vehicleResult.rows[0]);
    
    // Сохраняем телеметрические данные
    const result = await db.query(
      `INSERT INTO telemetry_data 
       (vehicle_id, rpm, speed, engine_temp, dtc_codes, o2_voltage, fuel_pressure, intake_temp, maf_sensor, throttle_pos, engine_health, oil_health, tires_health, brakes_health) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
       RETURNING id`,
      [
        vehicleResult.rows[0].id,
        data.rpm,
        data.speed,
        data.engineTemp,
        data.dtcCodes,
        data.o2Voltage,
        data.fuelPressure,
        data.intakeTemp,
        data.mafSensor,
        data.throttlePos,
        data.engineHealth,
        data.oilHealth,
        data.tiresHealth,
        data.brakesHealth
      ]
    );
    
    console.log('Telemetry data saved successfully:', result.rows[0]);
    
    res.status(201).json({ message: 'Телеметрические данные успешно сохранены', id: result.rows[0].id });
  } catch (error) {
    console.error('Error saving telemetry:', error);
    res.status(500).json({ message: 'Ошибка при сохранении телеметрических данных', error: error.message });
  }
};

exports.getTelemetry = async (req, res) => {
  try {
    const { vin } = req.user.vehicles && req.user.vehicles.length > 0 ? req.user.vehicles[0] : null;
    const { role } = req.user;
    
    console.log('Getting telemetry data:', { vin, role });
    
    // Проверяем наличие VIN
    if (!vin) {
      console.error('VIN not found in token');
      return res.status(400).json({ message: 'VIN не найден в токене. Пожалуйста, зарегистрируйте автомобиль.' });
    }
    
    // Проверяем существование автомобиля в базе данных
    const vehicleResult = await db.query(
      'SELECT id FROM user_vehicles WHERE vin = $1',
      [vin]
    );
    
    if (vehicleResult.rows.length === 0) {
      console.error('Vehicle not found in database:', vin);
      return res.status(404).json({ message: 'Автомобиль не найден в базе данных.' });
    }
    
    // Получаем последние телеметрические данные
    const result = await db.query(
      `SELECT * FROM telemetry_data 
       WHERE vehicle_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [vehicleResult.rows[0].id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Телеметрические данные не найдены.' });
    }
    
    console.log('Telemetry data retrieved successfully');
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting telemetry:', error);
    res.status(500).json({ message: 'Ошибка при получении телеметрических данных', error: error.message });
  }
}; 