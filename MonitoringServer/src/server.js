require('dotenv').config({path:'../.env'});
const express = require('express');
const cors = require('cors');
const os = require('os');
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

// Функция для получения IP-адресов
function getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    Object.keys(interfaces).forEach((interfaceName) => {
        interfaces[interfaceName].forEach((interface) => {
            if (interface.family === 'IPv4' && !interface.internal) {
                addresses.push({
                    interface: interfaceName,
                    address: interface.address
                });
            }
        });
    });
    
    return addresses;
}

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

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/telemetry', telemetryRoutes);

app.get('/', (req, res) => {
  res.send('Car Monitoring Server v1.0');
});

initializeTables().then(() => {
  app.listen(PORT, () => {
    console.log('\n=== Server Information ===');
    console.log(`Server is running on port ${PORT}`);
    console.log('\nAvailable network interfaces:');
    const networkInterfaces = getNetworkInterfaces();
    networkInterfaces.forEach((iface) => {
      console.log(`- ${iface.interface}: http://${iface.address}:${PORT}`);
    });
    console.log('\n=========================\n');
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
