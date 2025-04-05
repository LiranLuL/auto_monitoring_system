const { Pool } = require('pg');
const Vehicle = require('../models/vehicle');

// Создаем пул соединений с PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'car_monitoring',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432
});

exports.saveTelemetry = async (data, vin, role) => {
  try {
    console.log('Saving telemetry data:', { data, vin, role });
    
    if (role !== 'user') {
      throw new Error('Access denied');
    }
    
    if (!vin) {
      console.error('VIN not found in token');
      throw new Error('VIN not found in token');
    }
    
    // Получаем все параметры из запроса
    const {
      rpm, 
      speed, 
      engineTemp, 
      dtcCodes, 
      o2Voltage, 
      fuelPressure, 
      intakeTemp,
      mafSensor,
      throttlePos,
      engineHealth,
      oilHealth,
      tiresHealth,
      brakesHealth
    } = data;
    
    // Создаем запись в базе данных
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Проверяем существование автомобиля по VIN
      const vehicleCheck = await client.query(`
        SELECT 1 FROM user_vehicles
        WHERE vin = $1
      `, [vin]);
      
      if (vehicleCheck.rows.length === 0) {
        throw new Error(`Vehicle with VIN ${vin} not found`);
      }
      
      console.log(`Vehicle with VIN ${vin} found, creating telemetry record`);
      
      // Создаем новую запись телеметрии
      const telemetryQuery = `
        INSERT INTO telemetry
        (vin, rpm, speed, engine_temp, dtc_codes, o2_voltage, fuel_pressure, intake_temp, maf_sensor, throttle_pos, engine_health, oil_health, tires_health, brakes_health, timestamp)
        VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        RETURNING id, timestamp;
      `;
      
      const telemetryParams = [
        vin,
        rpm || 0,
        speed || 0,
        engineTemp || 0,
        dtcCodes || '[]',
        o2Voltage || 0,
        fuelPressure || 0,
        intakeTemp || 0,
        mafSensor || 0,
        throttlePos || 0,
        engineHealth || 100,
        oilHealth || 100,
        tiresHealth || 100,
        brakesHealth || 100
      ];
      
      const result = await client.query(telemetryQuery, telemetryParams);
      await client.query('COMMIT');
      
      console.log('Telemetry saved successfully:', result.rows[0]);
      
      return {
        id: result.rows[0].id,
        timestamp: result.rows[0].timestamp,
        status: 'success',
        message: 'Telemetry data saved successfully'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database error:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving telemetry:', error);
    throw {
      status: 'error',
      message: error.message || 'Internal server error'
    };
  }
}; 