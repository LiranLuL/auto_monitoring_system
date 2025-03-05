const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

module.exports = pool;

// CREATE TABLE vehicles (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     vin VARCHAR(17) UNIQUE NOT NULL,
//     model VARCHAR(50) NOT NULL,
//     year INT NOT NULL
//   );
  
//   CREATE TABLE sensor_data (
//     id SERIAL PRIMARY KEY,
//     vehicle_id UUID REFERENCES vehicles(id),
//     rpm INT NOT NULL,
//     speed INT NOT NULL,
//     engine_temp INT NOT NULL,
//     dtc_codes JSONB,
//     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//   );
  
//   CREATE TABLE maintenance (
//     id SERIAL PRIMARY KEY,
//     vehicle_id UUID REFERENCES vehicles(id),
//     type VARCHAR(50) NOT NULL,
//     mileage INT NOT NULL,
//     date DATE NOT NULL
//   );