const bcrypt = require('bcrypt');
const db = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

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
      await db.query(userTableQuery);
      await db.query(vehicleTableQuery);
      console.log('Tables created or already exist');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  static async create({ email, username, password, vin, role = 'user' }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Вставляем пользователя
      const userResult = await client.query(
        'INSERT INTO users (email, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email, username, role',
        [email, username, hashedPassword, role]
      );
      
      const user = userResult.rows[0];
      
      // Если передан VIN, добавляем его в таблицу user_vehicles
      if (vin) {
        await client.query(
          'INSERT INTO user_vehicles (user_id, vin) VALUES ($1, $2)',
          [user.id, vin]
        );
      }
      
      await client.query('COMMIT');
      
      // Получаем пользователя с его vehicles
      return await this.findById(user.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByEmail(email) {
    const result = await db.query(
      'SELECT id, email, username, password, role FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async findByUsername(username) {
    const result = await db.query(
      'SELECT id, email, username, password, role FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT u.id, u.email, u.username, u.role, uv.vin FROM users u LEFT JOIN user_vehicles uv ON u.id = uv.user_id WHERE u.id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      username: result.rows[0].username,
      role: result.rows[0].role,
      vehicles: []
    };
    
    // Добавляем автомобили, если они есть
    if (result.rows.some(row => row.vin)) {
      user.vehicles = result.rows.filter(row => row.vin).map(row => ({ vin: row.vin }));
    }
    
    return user;
  }

  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
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