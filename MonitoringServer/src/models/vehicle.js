const { Pool } = require('pg');

const pool = new Pool({
  user: 'liran',
  host: 'localhost',
  database: 'car_monitoring',
  password: 'liran',
  port: 5432
});

class Vehicle {
  static async dropTables() {
    try {
      await pool.query('DROP TABLE IF EXISTS "vehicle_health" CASCADE;');
      await pool.query('DROP TABLE IF EXISTS "vehicles" CASCADE;');
      console.log('Vehicle tables dropped successfully');
    } catch (error) {
      console.error('Error dropping vehicle tables:', error);
      throw error;
    }
  }

  static async createTable() {
    try {
      // Сначала создаем таблицу vehicles
      const vehiclesQuery = `
        CREATE TABLE IF NOT EXISTS "vehicles" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "vin" VARCHAR(17) UNIQUE NOT NULL,
          "make" VARCHAR(100) NOT NULL,
          "model" VARCHAR(100) NOT NULL,
          "plate_number" VARCHAR(20) NOT NULL,
          "owner_phone" VARCHAR(20) NOT NULL,
          "mileage" INTEGER NOT NULL DEFAULT 0,
          "last_service_date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await pool.query(vehiclesQuery);
      console.log('Vehicles table created successfully');

      // Затем создаем таблицу vehicle_health
      const healthQuery = `
        CREATE TABLE IF NOT EXISTS "vehicle_health" (
          "id" SERIAL PRIMARY KEY,
          "vehicle_id" UUID REFERENCES "vehicles"("id"),
          "engine_health" INTEGER CHECK ("engine_health" BETWEEN 0 AND 100),
          "oil_health" INTEGER CHECK ("oil_health" BETWEEN 0 AND 100),
          "tires_health" INTEGER CHECK ("tires_health" BETWEEN 0 AND 100),
          "brakes_health" INTEGER CHECK ("brakes_health" BETWEEN 0 AND 100),
          "recorded_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await pool.query(healthQuery);
      console.log('Vehicle health table created successfully');
    } catch (error) {
      console.error('Error creating vehicle tables:', error);
      throw error;
    }
  }

  static async create({ vin, make, model, plate_number, owner_phone, mileage, lastServiceDate }) {
    try {
      const query = `
        INSERT INTO "vehicles" ("vin", "make", "model", "plate_number", "owner_phone", "mileage", "last_service_date")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const values = [vin, make, model, plate_number, owner_phone, mileage, lastServiceDate];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  static async search({ vin, ownerPhone }) {
    try {
      let query = `
        SELECT v.*, 
          COALESCE(vh."engine_health", 100) as "engine_health",
          COALESCE(vh."oil_health", 100) as "oil_health",
          COALESCE(vh."tires_health", 100) as "tires_health",
          COALESCE(vh."brakes_health", 100) as "brakes_health"
        FROM "vehicles" v
        LEFT JOIN "vehicle_health" vh ON v."id" = vh."vehicle_id"
        AND vh."recorded_at" = (
          SELECT MAX("recorded_at")
          FROM "vehicle_health"
          WHERE "vehicle_id" = v."id"
        )
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;

      if (vin) {
        query += ` AND v."vin" = $${paramCount}`;
        values.push(vin);
        paramCount++;
      }

      if (ownerPhone) {
        query += ` AND v."owner_phone" = $${paramCount}`;
        values.push(ownerPhone);
        paramCount++;
      }

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error searching vehicle:', error);
      throw error;
    }
  }

  static async findAll() {
    try {
      const query = `
        SELECT v.*, 
          COALESCE(vh."engine_health", 100) as "engine_health",
          COALESCE(vh."oil_health", 100) as "oil_health",
          COALESCE(vh."tires_health", 100) as "tires_health",
          COALESCE(vh."brakes_health", 100) as "brakes_health"
        FROM "vehicles" v
        LEFT JOIN "vehicle_health" vh ON v."id" = vh."vehicle_id"
        AND vh."recorded_at" = (
          SELECT MAX("recorded_at")
          FROM "vehicle_health"
          WHERE "vehicle_id" = v."id"
        )
        ORDER BY v."created_at" DESC;
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting all vehicles:', error);
      throw error;
    }
  }

  static async saveHealthData({ vehicleId, engineHealth, oilHealth, tiresHealth, brakesHealth }) {
    try {
      const query = `
        INSERT INTO "vehicle_health" ("vehicle_id", "engine_health", "oil_health", "tires_health", "brakes_health")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const values = [vehicleId, engineHealth, oilHealth, tiresHealth, brakesHealth];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error saving health data:', error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const query = `
        SELECT v.*, 
          COALESCE(vh."engine_health", 100) as "engine_health",
          COALESCE(vh."oil_health", 100) as "oil_health",
          COALESCE(vh."tires_health", 100) as "tires_health",
          COALESCE(vh."brakes_health", 100) as "brakes_health"
        FROM "vehicles" v
        LEFT JOIN "vehicle_health" vh ON v."id" = vh."vehicle_id"
        AND vh."recorded_at" = (
          SELECT MAX("recorded_at")
          FROM "vehicle_health"
          WHERE "vehicle_id" = v."id"
        )
        WHERE v."id" = $1;
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting vehicle by id:', error);
      throw error;
    }
  }

  static async update(id, { vin, make, model, plate_number, owner_phone, mileage, lastServiceDate }) {
    try {
      const query = `
        UPDATE "vehicles"
        SET 
          "vin" = COALESCE($1, "vin"),
          "make" = COALESCE($2, "make"),
          "model" = COALESCE($3, "model"),
          "plate_number" = COALESCE($4, "plate_number"),
          "owner_phone" = COALESCE($5, "owner_phone"),
          "mileage" = COALESCE($6, "mileage"),
          "last_service_date" = COALESCE($7, "last_service_date")
        WHERE "id" = $8
        RETURNING *;
      `;
      const values = [vin, make, model, plate_number, owner_phone, mileage, lastServiceDate, id];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  }
}

module.exports = Vehicle;