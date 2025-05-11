const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  serviceType: { type: String, enum: ['wifi', 'hotspot'], required: true },
  package: { type: String, required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, required: true },
  active: { type: Boolean, default: true },
  paymentHistory: [{
    amount: Number,
    date: { type: Date, default: Date.now },
    transactionId: String
  }]
});

module.exports = mongoose.model('User', userSchema);