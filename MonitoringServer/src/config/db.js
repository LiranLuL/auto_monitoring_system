const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'liran',
  host: 'localhost',
  database: "car_monitoring",
  password: "liran",
  port: 5432,  // Стандартный порт PostgreSQL
  max: 20,     // Максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000, // Время простоя клиента в пуле
  connectionTimeoutMillis: 2000, // Время ожидания подключения
});

// Проверка подключения
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('Successfully connected to PostgreSQL');
    release();
  }
});

module.exports = pool;

// SQL для создания таблиц
const createTablesSQL = `
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin VARCHAR(17) UNIQUE NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL
);

CREATE TABLE IF NOT EXISTS sensor_data (
    id SERIAL PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id),
    rpm INT NOT NULL,
    speed INT NOT NULL,
    engine_temp INT NOT NULL,
    dtc_codes TEXT[],  -- Изменено с JSONB на TEXT[]
    o2_voltage DOUBLE PRECISION,
    fuel_pressure DOUBLE PRECISION,
    intake_temp INT,
    maf_sensor DOUBLE PRECISION,
    throttle_pos INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance (
    id SERIAL PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id),
    type VARCHAR(50) NOT NULL,
    mileage INT NOT NULL,
    date DATE NOT NULL
);
`;

// Создаем таблицы при запуске
pool.query(createTablesSQL, (err, res) => {
  if (err) {
    console.error('Error creating tables:', err);
  } else {
    console.log('Tables created successfully');
  }
});