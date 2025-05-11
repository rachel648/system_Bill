const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
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
    amount: { type: Number, required: true },
    date: { 
      type: Date, 
      default: Date.now 
    },
    transactionId: { type: String, required: true }
  }]
}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// 🔽 Ensure all usernames are stored in lowercase
userSchema.pre('save', function(next) {
  if (this.username) {
    this.username = this.username.toLowerCase();
  }
  next();
});

// 🔽 Optional: Add an index for lowercase usernames to enforce uniqueness (recommended)
userSchema.index({ username: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
