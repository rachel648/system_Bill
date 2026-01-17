require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRoutes = require('./routes/userRoutes');

const app = express();

// ===== Set default JWT secret if not in .env =====
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'elite_networks_sandbox_key';
  console.log('⚠️  Using default JWT secret for development');
}

// ===== Middleware =====
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('public'));

// ===== Database Models =====
const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);

const paymentSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  package: { type: String, required: true },
  mpesaCode: String,
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'cancelled', 'expired', 'active'],
    default: 'pending'
  },
  startTime: { type: Date },
  endTime: { type: Date },
  requestId: String,
  checkoutRequestId: String,
  transactionDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  resultCode: Number,
  resultDesc: String
});

const Payment = mongoose.model('Payment', paymentSchema);

// ===== Initialize Admin =====
const initializeAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword
      });
      console.log('✅ Admin user created');
    }
  } catch (err) {
    console.error('❌ Error initializing admin:', err.message);
  }
};

// ===== Admin Authentication Middleware =====
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// ===== Routes =====
app.use('/api/users', userRoutes);

// ===== Admin Login =====
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Check if it's the default admin
    if (username === 'admin' && password === 'admin') {
      const admin = await Admin.findOne({ username: 'admin' });
      if (!admin) {
        // Create admin if doesn't exist
        const hashedPassword = await bcrypt.hash('admin', 10);
        const newAdmin = await Admin.create({
          username: 'admin',
          password: hashedPassword
        });
        
        const token = jwt.sign(
          { id: newAdmin._id, username: newAdmin.username, role: 'admin' },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        return res.json({
          success: true,
          token,
          admin: {
            id: newAdmin._id,
            username: newAdmin.username,
            role: newAdmin.role
          }
        });
      }
      
      // Verify existing admin password
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: admin._id, username: admin.username, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          role: admin.role
        }
      });
    }

    // Check for other admin users
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== Get All Payments (Admin) =====
app.get('/api/admin/payments', authenticateAdmin, async (req, res) => {
  try {
    const payments = await Payment.find().sort({ transactionDate: -1 });
    
    const paymentsWithStatus = payments.map(payment => {
      let isCurrentlyActive = false;
      let remainingTime = 0;
      
      if (payment.status === 'completed' && payment.endTime) {
        const now = new Date();
        const end = new Date(payment.endTime);
        isCurrentlyActive = now < end;
        
        if (isCurrentlyActive) {
          remainingTime = Math.max(0, Math.round((end - now) / (1000 * 60)));
        }
      }
      
      return {
        ...payment.toObject(),
        isCurrentlyActive,
        remainingTime
      };
    });

    res.json({ success: true, payments: paymentsWithStatus });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== Get Payment Stats (Admin) =====
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalPayments = await Payment.countDocuments();
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const activePayments = await Payment.countDocuments({ 
      status: 'completed',
      endTime: { $gt: new Date() }
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysPayments = await Payment.countDocuments({
      transactionDate: { $gte: today }
    });

    res.json({
      success: true,
      stats: {
        totalPayments,
        totalRevenue: totalRevenue[0]?.total || 0,
        activePayments,
        todaysPayments
      }
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== M-Pesa Access Token Generator =====
const generateAccessToken = async () => {
  try {
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
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
    return res.status(400).json({ success: false, message: 'Phone, amount, and package are required.' });
  }

  try {
    // Save payment record first
    const payment = new Payment({
      phoneNumber: phone,
      amount: parseFloat(amount),
      package: package,
      status: 'pending',
      transactionDate: new Date()
    });
    await payment.save();

    const accessToken = await generateAccessToken();
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);

    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString('base64');

    const stkResponse = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
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
        AccountReference: `ELITE-${package}`,
        TransactionDesc: `Payment for ${package} package`
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    // Update payment with request ID
    payment.requestId = stkResponse.data.CheckoutRequestID;
    payment.checkoutRequestId = stkResponse.data.CheckoutRequestID;
    await payment.save();

    res.status(200).json({
      success: true,
      message: 'STK Push request sent successfully',
      data: stkResponse.data,
      paymentId: payment._id
    });

  } catch (error) {
    console.error('❌ M-Pesa STK Push error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'M-Pesa STK push failed',
      error: error.response?.data || error.message
    });
  }
});

// ===== M-Pesa Callback Handler =====
app.post('/callback', async (req, res) => {
  try {
    const callbackData = req.body;
    console.log('📱 M-Pesa Callback received');

    if (!callbackData.Body || !callbackData.Body.stkCallback) {
      console.log('⚠️ Invalid callback format');
      return res.json({ ResultCode: 1, ResultDesc: "Invalid callback" });
    }

    const stkCallback = callbackData.Body.stkCallback;
    const resultCode = stkCallback.ResultCode;
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    
    // Find payment by checkoutRequestId
    let payment = await Payment.findOne({ checkoutRequestId });
    
    if (!payment) {
      console.log('⚠️ Payment not found for checkoutRequestId:', checkoutRequestId);
      return res.json({ ResultCode: 1, ResultDesc: "Payment not found" });
    }

    // Update payment with result code and description
    payment.resultCode = resultCode;
    payment.resultDesc = stkCallback.ResultDesc;

    if (resultCode === 0) {
      // Payment successful
      const items = stkCallback.CallbackMetadata?.Item || [];
      let mpesaCode = 'N/A';

      // Extract M-Pesa code
      const mpesaReceiptItem = items.find(item => item.Name === 'MpesaReceiptNumber');
      if (mpesaReceiptItem) {
        mpesaCode = mpesaReceiptItem.Value;
      }

      payment.status = 'completed';
      payment.mpesaCode = mpesaCode;
      
      // Calculate end time based on package duration
      const packageDurations = {
        'Basic': 1,
        'Intermediate': 2,
        'Big': 3,
        'Mega': 4,
        'Super': 5,
        'DayOffer': 24
      };

      const durationHours = packageDurations[payment.package] || 1;
      payment.startTime = new Date();
      payment.endTime = new Date(Date.now() + (durationHours * 60 * 60 * 1000));
      
      await payment.save();
      console.log(`✅ Payment completed for ${payment.phoneNumber}, M-Pesa Code: ${payment.mpesaCode}`);
      
    } else if (resultCode === 1032) {
      // User cancelled the payment
      payment.status = 'cancelled';
      await payment.save();
      console.log(`❌ Payment cancelled by user: ${payment.phoneNumber}`);
      
    } else {
      // Other errors
      payment.status = 'failed';
      await payment.save();
      console.log(`❌ Payment failed: ${payment.phoneNumber}, Code: ${resultCode}`);
    }

    res.json({ ResultCode: 0, ResultDesc: "Success" });
    
  } catch (err) {
    console.error('❌ Callback processing error:', err);
    res.status(500).json({ ResultCode: 1, ResultDesc: "Server error" });
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

// ===== Test Endpoint =====
app.get('/', (req, res) => {
  res.json({ 
    message: 'Elite Networks Hotspot API',
    version: '1.0.0',
    endpoints: [
      'POST /api/payment - Make payment',
      'POST /api/admin/login - Admin login',
      'GET /api/admin/payments - Get payments (admin)',
      'GET /api/admin/stats - Get stats (admin)',
      'GET /api/health - Health check'
    ]
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

    // Create indexes
    await mongoose.connection.db.collection('users').createIndex(
      { username: 1 },
      { unique: true }
    );
    console.log('✅ Unique index on users.username created');

    await Payment.createIndexes();
    await Admin.createIndexes();
    
    // Initialize admin user
    await initializeAdmin();
    console.log('✅ Admin initialization completed');

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
    console.log(`📱 M-Pesa Callback URL: ${process.env.MPESA_CALLBACK_URL}`);
    console.log('📊 Admin Dashboard: http://localhost:3000/service');
    console.log('🔑 Admin login: username=admin, password=admin');
  });
});

// ===== Unhandled Promise Rejection Handler =====
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
  process.exit(1);
});