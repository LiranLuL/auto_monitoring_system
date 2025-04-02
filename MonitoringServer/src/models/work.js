require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

class Work {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS "works" (
        "id" SERIAL PRIMARY KEY,
        "vehicle_id" UUID NOT NULL REFERENCES "vehicles"("id"),
        "technician_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "work_type" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "parts_used" TEXT,
        "cost" DECIMAL(10,2),
        "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('completed', 'in_progress', 'scheduled')) DEFAULT 'completed',
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "completed_at" TIMESTAMP WITH TIME ZONE
      );
    `;
    await pool.query(query);
  }

  static async create({ vehicleId, technicianId, workType, description, partsUsed, cost, status = 'completed' }) {
    const query = `
      INSERT INTO "works" ("vehicle_id", "technician_id", "work_type", "description", "parts_used", "cost", "status", "completed_at")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      vehicleId,
      technicianId,
      workType,
      description,
      partsUsed,
      cost,
      status,
      status === 'completed' ? new Date().toISOString() : null
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getByVehicleId(vehicleId) {
    const query = `
      SELECT w.*, u.username as technician_name
      FROM "works" w
      JOIN "users" u ON w.technician_id = u.id
      WHERE w.vehicle_id = $1
      ORDER BY w.created_at DESC;
    `;
    const result = await pool.query(query, [vehicleId]);
    return result.rows;
  }

  static async getByTechnicianId(technicianId) {
    const query = `
      SELECT w.*, v.plate_number, v.make, v.model
      FROM "works" w
      JOIN "vehicles" v ON w.vehicle_id = v.id
      WHERE w.technician_id = $1
      ORDER BY w.created_at DESC;
    `;
    const result = await pool.query(query, [technicianId]);
    return result.rows;
  }

  static async updateStatus(workId, status) {
    const query = `
      UPDATE "works"
      SET "status" = $1, "completed_at" = $2
      WHERE "id" = $3
      RETURNING *;
    `;
    const values = [status, status === 'completed' ? new Date() : null, workId];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getById(workId) {
    const query = `
      SELECT w.*, 
             v.plate_number, v.make, v.model,
             u.username as technician_name
      FROM "works" w
      JOIN "vehicles" v ON w.vehicle_id = v.id
      JOIN "users" u ON w.technician_id = u.id
      WHERE w.id = $1;
    `;
    const result = await pool.query(query, [workId]);
    return result.rows[0];
  }
}

module.exports = Work; 