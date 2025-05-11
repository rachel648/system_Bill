const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register User
router.post('/register', async (req, res) => {
  const { username, serviceType, duration } = req.body;
  const now = new Date();
  let endTime;

  if (serviceType === 'wifi') {
    endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  } else {
    endTime = new Date(now.getTime() + duration * 60 * 60 * 1000); // hours
  }

  const user = new User({ username, serviceType, package: `${duration}`, startTime: now, endTime, active: true });
  await user.save();

  res.json({ message: 'User registered and service activated!' });
});

// Check Status
router.get('/status/:username', async (req, res) => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const now = new Date();
  if (now > user.endTime) {
    user.active = false;
    await user.save();
  }

  res.json({ active: user.active, endTime: user.endTime });
});

// Renew
router.post('/renew', async (req, res) => {
  const { username, duration } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const now = new Date();
  let newEnd;

  if (user.serviceType === 'wifi') {
    newEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  } else {
    newEnd = new Date(now.getTime() + duration * 60 * 60 * 1000);
  }

  user.startTime = now;
  user.endTime = newEnd;
  user.active = true;
  await user.save();

  res.json({ message: 'Service renewed!', newEnd });
});

module.exports = router;
