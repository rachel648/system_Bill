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
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Process payment
router.post('/pay', async (req, res) => {
  try {
    const { username, amount, paymentMethod } = req.body;
    
    // Here you would integrate with a payment gateway in a real application
    // For now, we'll just simulate a successful payment
    
    // Find user and update their subscription
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Extend subscription based on payment amount
    // This is a simplified example - adjust according to your pricing model
    const extensionDays = Math.floor(amount / 100) * 30; // Example: $100 = 30 days
    user.endTime = new Date(user.endTime.getTime() + extensionDays * 24 * 60 * 60 * 1000);
    user.active = true;
    
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

module.exports = router;