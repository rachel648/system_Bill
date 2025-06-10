require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const userRoutes = require('./routes/userRoutes');

const app = express();

// ===== Middleware =====
app.use(cors({
  origin: 'http://localhost:3000', // Update for production
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('public')); // Serve static files

// ===== Routes =====
app.use('/api/users', userRoutes);

// ===== M-Pesa Access Token Generator =====
const generateAccessToken = async () => {
  try {
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
    const response = await axios.get(
      'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );
    return response.data.access_token;
  } catch (err) {
    console.error('❌ Failed to generate access token:', err.response?.data || err.message);
    throw err;
  }
};

// ===== M-Pesa STK Push Route =====
app.post('/api/payment', async (req, res) => {
  const { phone, amount, package } = req.body;

  if (!phone || !amount || !package) {
    return res.status(400).json({ message: 'Phone, amount, and package are required.' });
  }

  try {
    const accessToken = await generateAccessToken();
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);

    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString('base64');

    const stkResponse = await axios.post(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: parseFloat(amount),
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: package,
        TransactionDesc: `Payment for ${package} package`
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    res.status(200).json({
      message: 'STK Push request sent successfully',
      data: stkResponse.data
    });

  } catch (error) {
    console.error('❌ M-Pesa STK Push error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'M-Pesa STK push failed',
      error: error.response?.data || error.message
    });
  }
});

// ===== Health Check =====
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// ===== Database Connection =====
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    console.log('✅ MongoDB connected successfully');

    await mongoose.connection.db.collection('users').createIndex(
      { username: 1 },
      { unique: true }
    );
    console.log('✅ Unique index on users.username created');

  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
  });
});

// ===== Unhandled Promise Rejection Handler =====
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
  process.exit(1);
});
