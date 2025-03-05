const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Маршруты
app.use('/api', require('./routes/api'));

// Проверка работы
app.get('/', (req, res) => {
  res.send('Car Monitoring Server v1.0');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});