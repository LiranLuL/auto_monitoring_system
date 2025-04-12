const db = require('../db');

class Vehicle {
  static async createTables() {
    // Создаем таблицу автомобилей, если она не существует
    const vehicleTableQuery = `
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        vin VARCHAR(17) UNIQUE NOT NULL,
        make VARCHAR(50) NOT NULL,
        model VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        owner_name VARCHAR(100) NOT NULL,
        owner_phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Создаем таблицу для данных о состоянии автомобиля, если она не существует
    const healthTableQuery = `
      CREATE TABLE IF NOT EXISTS vehicle_health (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        engine_health FLOAT NOT NULL,
        oil_health FLOAT NOT NULL,
        tires_health FLOAT NOT NULL,
        brakes_health FLOAT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    try {
      await db.query(vehicleTableQuery);
      await db.query(healthTableQuery);
      console.log('Vehicle tables created or already exist');
    } catch (error) {
      console.error('Error creating vehicle tables:', error);
      throw error;
    }
  }

  static async create(vehicleData) {
    const { vin, make, model, year, owner_phone, plate_number } = vehicleData;
    
    const result = await db.query(
      'INSERT INTO vehicles (vin, make, model, year, owner_phone, plate_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [vin, make, model, year, owner_phone, plate_number]
    );
    
    return result.rows[0];
  }

  static async search(searchParams) {
    const { vin, ownerPhone } = searchParams;
    
    let query = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (vin) {
      query += ` AND vin ILIKE $${paramIndex}`;
      params.push(`%${vin}%`);
      paramIndex++;
    }
    
    if (ownerPhone) {
      query += ` AND owner_phone ILIKE $${paramIndex}`;
      params.push(`%${ownerPhone}%`);
      paramIndex++;
    }
    
    const result = await db.query(query, params);
    return result.rows;
  }

  static async findAll() {
    const result = await db.query('SELECT * FROM vehicles ORDER BY created_at DESC');
    return result.rows;
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByVin(vin) {
    const result = await db.query('SELECT * FROM vehicles WHERE vin = $1', [vin]);
    return result.rows[0];
  }

  static async update(id, vehicleData) {
    const { make, model, year, owner_name, owner_phone } = vehicleData;
    
    const result = await db.query(
      'UPDATE vehicles SET make = $1, model = $2, year = $3, owner_name = $4, owner_phone = $5 WHERE id = $6 RETURNING *',
      [make, model, 0, owner_name, owner_phone, id]
    );
    
    return result.rows[0];
  }

  static async saveHealthData(healthData) {
    const { vehicleId, engineHealth, oilHealth, tiresHealth, brakesHealth } = healthData;
    
    const result = await db.query(
      'INSERT INTO vehicle_health (vehicle_id, engine_health, oil_health, tires_health, brakes_health) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [vehicleId, engineHealth, oilHealth, tiresHealth, brakesHealth]
    );
    
    return result.rows[0];
  }

  static async getHealthData(vehicleId) {
    const result = await db.query(
      'SELECT * FROM vehicle_health WHERE vehicle_id = $1 ORDER BY created_at DESC LIMIT 1',
      [vehicleId]
    );
    
    return result.rows[0];
  }
}

module.exports = Vehicle;
