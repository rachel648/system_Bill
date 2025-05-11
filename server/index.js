require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const userRoutes = require('./routes/userRoutes');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);  // Ensure STRIPE_SECRET_KEY is in your .env

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',  // Update this if your frontend is hosted elsewhere
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Routes
app.use('/api/users', userRoutes);

// ✅ Payment Route - Accepts phone, amount, and package
app.post('/api/payment', async (req, res) => {
  const { phone, amount, package } = req.body;

  try {
    // Remove any non-numeric characters like '$' and convert to cents
    const cleanedAmount = parseFloat(amount.toString().replace(/[^0-9.]/g, '')) * 100;

    if (isNaN(cleanedAmount) || cleanedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount provided.' });
    }

    // Create payment intent with Stripe
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

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Database Connection
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

// Start Server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});
