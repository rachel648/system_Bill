require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const userRoutes = require('./routes/userRoutes');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);  // Ensure this key is in your .env

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',  // Adjust for your frontend
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Serve static files like favicon
app.use(express.static('public'));

// Routes
app.use('/api/users', userRoutes);

// Payment Route - handles payment for the selected package and phone number
app.post('/api/payment', async (req, res) => {
  const { phone, amount, package } = req.body;

  try {
    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseFloat(amount) * 100,  // Amount in cents (smallest currency unit)
      currency: 'usd',
      description: `Payment for ${package} package`,
      metadata: { phone, package },
    });

    res.status(200).json({
      message: 'Payment request created successfully',
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment processing failed', error: error.message });
  }
});

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Database connection
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

// Start the server
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
