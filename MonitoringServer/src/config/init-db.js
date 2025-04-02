const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
console.log(pool);
async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log('Connected to database');
    
    const sql = fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf8');
    await client.query(sql);
    
    console.log('Database initialized successfully');
    client.release();
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
  }
}

initDatabase(); 