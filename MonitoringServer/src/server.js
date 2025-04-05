require('dotenv').config({path:'../.env'});
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const telemetryRoutes = require('./routes/telemetry');

const User = require('./models/user');
const Vehicle = require('./models/vehicle');
const Work = require('./models/work');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Инициализация таблиц последовательно
async function initializeTables() {
  try {
    // Создаем таблицы пользователей и автомобилей
    await User.createTables();
    console.log('User tables created successfully');
    
    // Добавляем другие таблицы если нужно
    if (typeof Vehicle.createTable === 'function') {
      await Vehicle.createTable();
      console.log('Vehicle tables created successfully');
    }
    
    if (typeof Work.createTable === 'function') {
      await Work.createTable();
      console.log('Work table created successfully');
    }
  } catch (error) {
    console.error('Error initializing tables:', error);
    process.exit(1);
  }
}

// Маршруты API
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/telemetry', telemetryRoutes);

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
