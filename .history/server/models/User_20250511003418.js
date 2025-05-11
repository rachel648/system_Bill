const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  serviceType: { 
    type: String, 
    required: true,
    enum: ['wifi', 'hotspot'] 
  },
  package: { 
    type: String, 
    required: true,
    enum: ['basic', 'standard', 'premium']
  },
  startTime: { 
    type: Date, 
    default: Date.now 
  },
  endTime: { 
    type: Date, 
    required: true 
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  paymentHistory: [{
    amount: Number,
    date: { 
      type: Date, 
      default: Date.now 
    },
    transactionId: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);