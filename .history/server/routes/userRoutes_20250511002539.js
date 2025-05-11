const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, serviceType, package, duration } = req.body;
    
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 24 * 60 * 60 * 1000); // duration in days
    
    const user = new User({
      username,
      serviceType,
      package,
      startTime,
      endTime,
      active: true
    });

    await user.save();
    res.status(201).json({ message: 'Registration successful', user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Process payment
router.post('/pay', async (req, res) => {
  try {
    const { username, amount, duration } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Extend subscription
    const currentEndTime = user.endTime > new Date() ? user.endTime : new Date();
    user.endTime = new Date(currentEndTime.getTime() + duration * 24 * 60 * 60 * 1000);
    user.active = true;
    
    // Record payment
    user.paymentHistory.push({
      amount,
      transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`
    });
    
    await user.save();
    
    res.json({ 
      message: 'Payment processed successfully',
      user 
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get user info
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check status
router.get('/status/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update active status based on endTime
    const now = new Date();
    if (user.endTime < now && user.active) {
      user.active = false;
      await user.save();
    }
    
    res.json({
      active: user.active,
      endTime: user.endTime
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;