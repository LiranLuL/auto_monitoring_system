const { Pool } = require('pg');
require('dotenv').config();

// Создаем пул соединений с PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'car_monitoring',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432
});

async function migrateDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Проверяем существование таблицы users
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      // Проверяем, существует ли столбец username
      const columnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'username'
        );
      `);
      
      // Исправляем ограничение CHECK для поля role
      console.log('Обновляем ограничение CHECK для поля role...');
      try {
        // Удаляем существующее ограничение
        await client.query(`
          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        `);
        
        // Добавляем новое ограничение
        await client.query(`
          ALTER TABLE users ADD CONSTRAINT users_role_check 
          CHECK (role IN ('user', 'technician', 'admin'));
        `);
        
        console.log('Ограничение CHECK обновлено.');
      } catch (e) {
        console.error('Ошибка при обновлении ограничения CHECK:', e);
      }
      
      if (!columnExists.rows[0].exists) {
        console.log('Добавляем столбец username...');
        
        // Добавляем столбец username
        await client.query(`
          ALTER TABLE users ADD COLUMN username VARCHAR(100);
        `);
        
        // Устанавливаем значение по умолчанию для существующих пользователей (используем email)
        await client.query(`
          UPDATE users SET username = email WHERE username IS NULL;
        `);
        
        // Делаем столбец NOT NULL
        await client.query(`
          ALTER TABLE users ALTER COLUMN username SET NOT NULL;
        `);
        
        console.log('Миграция успешно выполнена!');
      } else {
        console.log('Столбец username уже существует.');
      }
    } else {
      console.log('Таблица users не существует. Миграция не требуется.');
    }
    
    // Проверяем и добавляем ограничение уникальности для VIN в таблице user_vehicles
    console.log('Проверяем наличие ограничения уникальности для VIN...');
    
    // Проверяем существование таблицы user_vehicles
    const vehiclesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_vehicles'
      );
    `);
    
    if (vehiclesTableExists.rows[0].exists) {
      // Проверяем существование ограничения уникальности для vin
      const vinConstraintExists = await client.query(`
        SELECT COUNT(*) 
        FROM pg_constraint 
        WHERE conrelid = 'user_vehicles'::regclass 
        AND contype = 'u' 
        AND array_to_string(conkey, ',') = 
          (SELECT array_to_string(array_agg(attnum::text), ',') 
           FROM pg_attribute 
           WHERE attrelid = 'user_vehicles'::regclass AND attname = 'vin');
      `);
      
      if (parseInt(vinConstraintExists.rows[0].count) === 0) {
        console.log('Добавляем ограничение уникальности для VIN...');
        
        try {
          // Проверяем уникальность текущих VIN-кодов
          const duplicateVins = await client.query(`
            SELECT vin, COUNT(*) 
            FROM user_vehicles 
            GROUP BY vin 
            HAVING COUNT(*) > 1;
          `);
          
          if (duplicateVins.rows.length > 0) {
            console.warn('В таблице есть дублирующиеся VIN! Исправьте вручную перед добавлением ограничения.');
            console.warn('Дублирующиеся VIN:', duplicateVins.rows);
          } else {
            // Добавляем ограничение уникальности
            await client.query(`
              ALTER TABLE user_vehicles ADD CONSTRAINT user_vehicles_vin_unique UNIQUE (vin);
            `);
            console.log('Ограничение уникальности для VIN успешно добавлено!');
          }
        } catch (e) {
          console.error('Ошибка при добавлении ограничения уникальности для VIN:', e);
        }
      } else {
        console.log('Ограничение уникальности для VIN уже существует.');
      }
    } else {
      console.log('Таблица user_vehicles не существует.');
    }
    
    // Создаем таблицу телеметрии, если она не существует
    console.log('Проверяем наличие таблицы телеметрии...');
    const telemetryTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'telemetry'
      );
    `);
    
    if (!telemetryTableExists.rows[0].exists) {
      console.log('Создаем таблицу телеметрии...');
      
      const telemetryTableQuery = `
        CREATE TABLE telemetry (
          id SERIAL PRIMARY KEY,
          vin VARCHAR(17) NOT NULL,
          rpm INTEGER NOT NULL DEFAULT 0,
          speed INTEGER NOT NULL DEFAULT 0,
          engine_temp INTEGER NOT NULL DEFAULT 0,
          dtc_codes TEXT NOT NULL DEFAULT '[]',
          o2_voltage NUMERIC(5,2) NOT NULL DEFAULT 0,
          fuel_pressure NUMERIC(6,2) NOT NULL DEFAULT 0,
          intake_temp INTEGER NOT NULL DEFAULT 0,
          maf_sensor NUMERIC(6,2) NOT NULL DEFAULT 0,
          throttle_pos INTEGER NOT NULL DEFAULT 0,
          engine_health INTEGER NOT NULL DEFAULT 100,
          oil_health INTEGER NOT NULL DEFAULT 100,
          tires_health INTEGER NOT NULL DEFAULT 100,
          brakes_health INTEGER NOT NULL DEFAULT 100,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (vin) REFERENCES user_vehicles(vin) ON DELETE CASCADE
        );
        
        CREATE INDEX telemetry_vin_idx ON telemetry(vin);
        CREATE INDEX telemetry_timestamp_idx ON telemetry(timestamp);
      `;
      
      await client.query(telemetryTableQuery);
      console.log('Таблица телеметрии успешно создана!');
    } else {
      console.log('Таблица телеметрии уже существует.');
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка при выполнении миграции:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Запуск миграции
migrateDatabase()
  .then(() => {
    console.log('Миграция завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('Ошибка миграции:', error);
    process.exit(1);
  }); 