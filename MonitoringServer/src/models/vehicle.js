const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vin: { type: String, required: true, unique: true },
  make: String,
  model: String,
  year: Number,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);