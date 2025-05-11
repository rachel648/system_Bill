// routes/userRoutes.js
router.post('/register', async (req, res) => {
  try {
    const { username, serviceType, package: pkg, duration } = req.body;
    
    // Input validation
    if (!username || !serviceType || !pkg || !duration) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 24 * 60 * 60 * 1000);

    const user = new User({
      username,
      serviceType,
      package: pkg,
      startTime,
      endTime,
      active: true
    });

    await user.save();
    res.status(201).json({ 
      message: 'Registration successful',
      user: {
        username: user.username,
        serviceType: user.serviceType,
        endTime: user.endTime
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      message: 'Registration failed: ' + err.message 
    });
  }
});