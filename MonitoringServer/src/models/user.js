require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const pool = new Pool({
  user: 'liran',
  host: 'localhost',
  database: 'car_monitoring',
  password: 'liran',
  port: 5432
});

class User {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(50) UNIQUE NOT NULL,
        "email" VARCHAR(100) UNIQUE NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('admin', 'technician')) DEFAULT 'technician',
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);
  }

  static async create({ username, email, password, role = 'technician' }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO "users" ("username", "email", "password", "role")
      VALUES ($1, $2, $3, $4)
      RETURNING "id", "username", "email", "role", "created_at";
    `;
    const values = [username, email, hashedPassword, role];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const query = 'SELECT * FROM "users" WHERE "username" = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM "users" WHERE "email" = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT "id", "username", "email", "role", "created_at" FROM "users" WHERE "id" = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static generateToken(user) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    return jwt.sign(
      { 
        id: user.id,
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  static async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }
}

module.exports = User; 