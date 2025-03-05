const sensorModel = require('../models/sensor');
const axios = require('axios');

exports.saveData = async (req, res) => {
  try {
    const data = req.body;
    const result = await sensorModel.saveSensorData(data);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


exports.getPredictions = async (req, res) => {
  try {
    const response = await axios.post('http://localhost:5000/predict', {
      rpm: req.body.rpm,
      temperature: req.body.engineTemp
    });
    
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Prediction service unavailable' });
  }
};