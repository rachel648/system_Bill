const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, serviceType, package, duration } = req.body;
    
    // Validate input
    if (!username || !serviceType || !package || !duration) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
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

    // Create new user
    const user = new User({
      username,
      serviceType,
      package,
      startTime,
      endTime
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

// Get all users (for testing)
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json({ 
      success: true,
      count: users.length,
      data: users 
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

module.exports = router;