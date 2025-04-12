const { Pool } = require('pg');
require('dotenv').config();

// Создаем пул соединений с PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'car_monitoring',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432
});

// Метод для выполнения запросов
const query = async (text, params) => {
  return await pool.query(text, params);
};

// Метод для получения клиента из пула
const getClient = async () => {
  return await pool.connect();
};

// Метод для создания таблиц, если они не существуют
const initTables = async () => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    // Создаем таблицу пользователей
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Создаем таблицу автомобилей пользователей
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_vehicles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        vin VARCHAR(17) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, vin)
      )
    `);
    
    // Создаем таблицу автомобилей
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        vin VARCHAR(17) UNIQUE NOT NULL,
        make VARCHAR(50) NOT NULL,
        model VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        owner_name VARCHAR(100) NOT NULL,
        owner_phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Создаем таблицу для данных о состоянии автомобиля
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicle_health (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        engine_health FLOAT NOT NULL,
        oil_health FLOAT NOT NULL,
        tires_health FLOAT NOT NULL,
        brakes_health FLOAT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Создаем таблицу телеметрических данных
    await client.query(`
      CREATE TABLE IF NOT EXISTS telemetry_data (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES user_vehicles(id) ON DELETE CASCADE,
        rpm INTEGER,
        speed INTEGER,
        engine_temp FLOAT,
        dtc_codes TEXT,
        o2_voltage FLOAT,
        fuel_pressure FLOAT,
        intake_temp FLOAT,
        maf_sensor FLOAT,
        throttle_pos FLOAT,
        engine_health INTEGER,
        oil_health INTEGER,
        tires_health INTEGER,
        brakes_health INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query('COMMIT');
    console.log('Tables created or already exist');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Инициализируем таблицы при запуске
initTables().catch(console.error);

module.exports = {
  query,
  getClient,
  initTables
}; 