class SensorModel {
    async saveSensorData(data) {
      const query = `
        INSERT INTO sensor_data (vehicle_id, rpm, speed, engine_temp, dtc_codes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const values = [
        data.vehicleId,
        data.rpm,
        data.speed,
        data.engineTemp,
        data.dtcCodes
      ];
      
      return await pool.query(query, values);
    }
  }
  
  module.exports = new SensorModel();