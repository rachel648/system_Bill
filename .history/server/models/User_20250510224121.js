const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  serviceType: String, // 'wifi' or 'hotspot'
  package: String,
  startTime: Date,
  endTime: Date,
  active: Boolean
});

module.exports = mongoose.model('User', userSchema);
