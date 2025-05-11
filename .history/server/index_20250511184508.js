require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const userRoutes = require('./routes/userRoutes');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/users', userRoutes);

// ✅ General Package Payment Route
app.post('/api/payment', async (req, res) => {
  const { phone, amount, package } = req.body;

  try {
    const cleanedAmount = parseFloat(amount.toString().replace(/[^0-9.]/g, '')) * 100;

    if (isNaN(cleanedAmount) || cleanedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount provided.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(cleanedAmount),
      currency: 'usd',
      description: `Payment for ${package} package`,
      metadata: { phone, package }
    });

    res.status(200).json({
      message: 'Payment request created successfully',
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ message: 'Payment processing failed', error: error.message });
  }
});

// ✅ Hotspot Payment Route (20 KES per hour)
app.post('/api/hotspot-payment', async (req, res) => {
  const { phone, hours } = req.body;

  try {
    const ratePerHour = 20;
    const amount = hours * ratePerHour;

    if (!phone || isNaN(hours) || hours <= 0) {
      return res.status(400).json({ message: 'Invalid phone number or hours provided.' });
    }

    const cleanedAmount = Math.round(amount * 100); // Stripe needs cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount: cleanedAmount,
      currency: 'usd',
      description: `Hotspot payment for ${hours} hour(s)` ,
      metadata: { phone, hours }
    });

    res.status(200).json({
      message: 'Hotspot payment request created successfully',
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Hotspot Stripe error:', error);
    res.status(500).json({ message: 'Hotspot payment failed', error: error.message });
  }
});

// ✅ Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// ✅ MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB connected successfully');

    await mongoose.connection.db.collection('users').createIndex({ username: 1 }, { unique: true });
    console.log('✅ Database indexes created');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// ✅ Start Server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
  });
});

// ✅ Handle Unhandled Rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});