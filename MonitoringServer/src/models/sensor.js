const pool = require('../config/db');

class SensorModel {
    async saveSensorData(data) {
      // Преобразуем JSON строку DTC кодов в массив
      let dtcCodes = [];
      try {
        if (data.dtcCodes) {
          dtcCodes = JSON.parse(data.dtcCodes);
        }
      } catch (e) {
        console.error('Error parsing DTC codes:', e);
        dtcCodes = [];
      }

      const query = `
        INSERT INTO sensor_data (
          vehicle_id, rpm, speed, engine_temp, dtc_codes,
          o2_voltage, fuel_pressure, intake_temp, maf_sensor, throttle_pos
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `;
      const values = [
        data.vehicleId,
        data.rpm,
        data.speed,
        data.engineTemp,
        dtcCodes,  // Теперь передаем массив вместо JSON строки
        data.o2Voltage,
        data.fuelPressure,
        data.intakeTemp,
        data.mafSensor,
        data.throttlePos
      ];
      
      return await pool.query(query, values);
    }
}

module.exports = new SensorModel();