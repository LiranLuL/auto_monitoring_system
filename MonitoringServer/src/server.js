require('dotenv').config({path:'../.env'});
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

const User = require('./models/user');
const Vehicle = require('./models/vehicle');
const Work = require('./models/work');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Инициализация соединения с базой данных
const pool = new Pool({
  user: 'liran',
  host: 'localhost',
  database: 'car_monitoring',
  password: 'liran',
  port: 5432
});

// Проверка соединения с базой данных
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Successfully connected to database');
  release();
});

// Инициализация таблиц последовательно
async function initializeTables() {
  try {
   
    
    // Создаем таблицы заново
    await Vehicle.createTable();
    console.log('Vehicle tables created successfully');

    // Создаем таблицу пользователей
    await User.createTable();
    console.log('Users table created successfully');

    // Создаем таблицу работ
    await Work.createTable();
    console.log('Work table created successfully');
  } catch (error) {
    console.error('Error initializing tables:', error);
    process.exit(1);
  }
}

// Маршруты аутентификации
app.use('/api/auth', authRoutes);

// Маршруты API (защищенные)
app.use('/api', apiRoutes);

// Проверка работы
app.get('/', (req, res) => {
  res.send('Car Monitoring Server v1.0');
});

// Запуск сервера
initializeTables().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
