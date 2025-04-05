const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Создаем пул соединений с PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'car_monitoring',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432
});

class User {
  static async createTables() {
    // Создаем таблицу пользователей, если она не существует
    const userTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'technician', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Создаем таблицу для VIN автомобилей, если она не существует
    const vehicleTableQuery = `
      CREATE TABLE IF NOT EXISTS user_vehicles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        vin VARCHAR(17) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, vin)
      );
    `;
    
    try {
      await pool.query(userTableQuery);
      await pool.query(vehicleTableQuery);
      console.log('Tables created or already exist');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  static async create({ email, password, username, vin, role = 'user' }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Создаем пользователя
      const userQuery = `
        INSERT INTO users (email, password, username, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, username, role, created_at;
      `;
      const userValues = [email, hashedPassword, username, role];
      const userResult = await client.query(userQuery, userValues);
      const user = userResult.rows[0];
      
      // Если указан VIN, добавляем автомобиль
      if (vin) {
        const vehicleQuery = `
          INSERT INTO user_vehicles (user_id, vin)
          VALUES ($1, $2)
          RETURNING vin;
        `;
        const vehicleValues = [user.id, vin.toUpperCase()];
        await client.query(vehicleQuery, vehicleValues);
      }
      
      await client.query('COMMIT');
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByEmail(email) {
    const query = `
      SELECT users.*, array_agg(user_vehicles.vin) as vehicles
      FROM users 
      LEFT JOIN user_vehicles ON users.id = user_vehicles.user_id
      WHERE users.email = $1
      GROUP BY users.id;
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findByUsername(username) {
    const query = `
      SELECT users.*, array_agg(user_vehicles.vin) as vehicles
      FROM users 
      LEFT JOIN user_vehicles ON users.id = user_vehicles.user_id
      WHERE users.username = $1
      GROUP BY users.id;
    `;
    const result = await pool.query(query, [username]);
    return result.rows[0] || null;
  }

  static async findById(id) {
    const query = `
      SELECT users.*, array_agg(user_vehicles.vin) as vehicles
      FROM users 
      LEFT JOIN user_vehicles ON users.id = user_vehicles.user_id
      WHERE users.id = $1
      GROUP BY users.id;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static generateToken(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        vin: user.vehicles && user.vehicles.length > 0 && user.vehicles[0] !== null 
            ? user.vehicles[0] 
            : null,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
  }
}

module.exports = User; 