const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');

// Register new user
router.post('/register', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(500).json({ 
      success: false,
      message: 'Database not connected' 
    });
  }

  try {
    const { username, serviceType, package, duration } = req.body;
    
    // Validate input
    if (!username || !serviceType || !package || !duration) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    if (duration < 1) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be at least 1 day'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Calculate dates
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 24 * 60 * 60 * 1000);

    // Calculate amount based on package
    const packageRates = {
      basic: 10,
      standard: 20,
      premium: 30
    };
    const amount = packageRates[package] * (duration / 30);

    // Create new user
    const user = new User({
      username,
      serviceType,
      package,
      startTime,
      endTime,
      paymentHistory: [{
        amount,
        transactionId: `TXN-${Date.now()}`
      }]
    });

    // Save to database
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: err.message
    });
  }
});

// Get user status
router.get('/status/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      active: user.endTime > new Date(),
      endTime: user.endTime,
      package: user.package
    });
  } catch (err) {
    console.error('Error fetching user status:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching user status'
    });
  }
});

// Make payment
router.post('/pay', async (req, res) => {
  try {
    const { username, amount, duration } = req.body;
    
    if (!username || !amount || !duration) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Extend service duration
    const newEndTime = new Date(Math.max(
      user.endTime.getTime(),
      new Date().getTime()
    ) + duration * 24 * 60 * 60 * 1000);

    user.endTime = newEndTime;
    user.paymentHistory.push({
      amount,
      transactionId: `TXN-${Date.now()}`
    });

    await user.save();

    res.json({
      success: true,
      message: `Payment processed. Service extended until ${newEndTime.toLocaleDateString()}`,
      endTime: newEndTime
    });
  } catch (err) {
    console.error('Payment processing error:', err);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed'
    });
  }
});

// Get all users (for testing)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-paymentHistory');
    res.json({ 
      success: true,
      count: users.length,
      data: users 
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

module.exports = router;
