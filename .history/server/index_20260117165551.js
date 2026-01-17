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

// ===== Middleware =====
// Special middleware for M-Pesa callback (must come before CORS)
app.use('/callback', express.text({ type: '*/*' }));

// Regular middleware
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin_secret_key');
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// ===== Routes =====
app.use('/api/users', userRoutes);

// ===== Admin Routes =====
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

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
      process.env.JWT_SECRET || 'admin_secret_key',
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
      
      // Only calculate for completed payments with endTime
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
    const completedPayments = await Payment.countDocuments({ status: 'completed' });
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
        completedPayments,
        failedPayments: await Payment.countDocuments({ status: 'failed' }),
        cancelledPayments: await Payment.countDocuments({ status: 'cancelled' }),
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

// ===== Admin Control Routes =====

// Activate a payment manually
app.post('/api/admin/payments/:id/activate', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { durationHours } = req.body;
    
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    // Calculate hours based on package if not provided
    const packageDurations = {
      'Basic': 1,
      'Intermediate': 2,
      'Big': 3,
      'Mega': 4,
      'Super': 5,
      'DayOffer': 24
    };
    
    const hours = durationHours || packageDurations[payment.package] || 1;
    
    payment.status = 'completed';
    payment.startTime = new Date();
    payment.endTime = new Date(Date.now() + (hours * 60 * 60 * 1000));
    payment.mpesaCode = payment.mpesaCode || `MANUAL-${Date.now()}`;
    
    await payment.save();
    
    res.json({
      success: true,
      message: `Payment activated for ${hours} hours`,
      payment
    });
    
  } catch (err) {
    console.error('Error activating payment:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Deactivate/expire a payment manually
app.post('/api/admin/payments/:id/deactivate', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    // Set end time to now (immediate expiration)
    payment.endTime = new Date();
    
    await payment.save();
    
    res.json({
      success: true,
      message: 'Payment deactivated',
      payment
    });
    
  } catch (err) {
    console.error('Error deactivating payment:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a payment
app.delete('/api/admin/payments/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findByIdAndDelete(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
    
  } catch (err) {
    console.error('Error deleting payment:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update payment status
app.put('/api/admin/payments/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, mpesaCode, amount } = req.body;
    
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    // Validate status
    const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    if (status) payment.status = status;
    if (mpesaCode) payment.mpesaCode = mpesaCode;
    if (amount) payment.amount = parseFloat(amount);
    
    // If setting to completed and no start/end times, set them
    if (status === 'completed' && !payment.startTime) {
      const packageDurations = {
        'Basic': 1, 'Intermediate': 2, 'Big': 3, 
        'Mega': 4, 'Super': 5, 'DayOffer': 24
      };
      const durationHours = packageDurations[payment.package] || 1;
      payment.startTime = new Date();
      payment.endTime = new Date(Date.now() + (durationHours * 60 * 60 * 1000));
    }
    
    await payment.save();
    
    res.json({
      success: true,
      message: 'Payment updated successfully',
      payment
    });
    
  } catch (err) {
    console.error('Error updating payment:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get chart data for graphical tracker
app.get('/api/admin/chart-data', authenticateAdmin, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      last7Days.push(date);
    }
    
    // Get payment counts by day
    const dailyPayments = await Promise.all(
      last7Days.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const count = await Payment.countDocuments({
          transactionDate: {
            $gte: date,
            $lt: nextDay
          }
        });
        
        return {
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          count
        };
      })
    );
    
    // Get package distribution
    const packageDistribution = await Payment.aggregate([
      {
        $group: {
          _id: '$package',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get hourly data for today
    const hourlyData = [];
    for (let hour = 0; hour < 24; hour++) {
      const startHour = new Date(today);
      startHour.setHours(hour, 0, 0, 0);
      const endHour = new Date(today);
      endHour.setHours(hour + 1, 0, 0, 0);
      
      const count = await Payment.countDocuments({
        transactionDate: {
          $gte: startHour,
          $lt: endHour
        }
      });
      
      hourlyData.push({
        hour: `${hour}:00`,
        count
      });
    }
    
    res.json({
      success: true,
      chartData: {
        dailyPayments,
        packageDistribution,
        hourlyData,
        totalActive: await Payment.countDocuments({ 
          status: 'completed',
          endTime: { $gt: now }
        }),
        totalPending: await Payment.countDocuments({ status: 'pending' }),
        totalCompleted: await Payment.countDocuments({ status: 'completed' })
      }
    });
    
  } catch (err) {
    console.error('Error fetching chart data:', err);
    res.status(500).json({ success: false, message: 'Server error' });
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
        CallBackURL: `${process.env.MPESA_CALLBACK_URL}`,
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
    
    // Update payment status to failed if it exists
    try {
      const payment = await Payment.findOne({ phoneNumber: phone, status: 'pending' })
        .sort({ createdAt: -1 });
      if (payment) {
        payment.status = 'failed';
        payment.resultDesc = 'STK Push request failed';
        await payment.save();
      }
    } catch (dbErr) {
      console.error('Error updating payment status:', dbErr);
    }

    res.status(500).json({
      success: false,
      message: 'M-Pesa STK push failed',
      error: error.response?.data || error.message
    });
  }
});

// ===== FIXED M-Pesa Callback Handler =====
app.post('/callback', async (req, res) => {
  console.log('📱 M-Pesa Callback received (raw):', req.body);
  
  try {
    let callbackData;
    
    // Try to parse as JSON
    if (typeof req.body === 'string') {
      try {
        callbackData = JSON.parse(req.body);
      } catch (parseErr) {
        console.log('⚠️ Could not parse callback as JSON, using raw string');
        callbackData = req.body;
      }
    } else if (typeof req.body === 'object') {
      callbackData = req.body;
    } else {
      console.log('⚠️ Unknown callback format');
      return res.json({ ResultCode: 1, ResultDesc: "Invalid callback format" });
    }
    
    console.log('📱 M-Pesa Callback parsed:', JSON.stringify(callbackData, null, 2));

    // Extract STK callback data
    let stkCallback;
    if (callbackData.Body && callbackData.Body.stkCallback) {
      stkCallback = callbackData.Body.stkCallback;
    } else if (callbackData.stkCallback) {
      stkCallback = callbackData.stkCallback;
    } else {
      console.log('⚠️ No STK callback found in data');
      return res.json({ ResultCode: 1, ResultDesc: "No STK callback data" });
    }

    const resultCode = parseInt(stkCallback.ResultCode);
    const checkoutRequestId = stkCallback.CheckoutRequestID || callbackData.CheckoutRequestID;
    
    if (!checkoutRequestId) {
      console.log('⚠️ No checkoutRequestId found in callback');
      return res.json({ ResultCode: 1, ResultDesc: "Missing checkoutRequestId" });
    }

    // Find payment by checkoutRequestId
    let payment = await Payment.findOne({ checkoutRequestId });
    
    if (!payment) {
      console.log('⚠️ Payment not found for checkoutRequestId:', checkoutRequestId);
      
      // Try to find by phone number from callback metadata
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      const phoneItem = metadata.find(item => item.Name === 'PhoneNumber');
      if (phoneItem && phoneItem.Value) {
        const phone = phoneItem.Value.toString();
        if (phone.startsWith('254')) {
          // Find the latest pending payment for this phone
          payment = await Payment.findOne({ 
            phoneNumber: phone, 
            status: 'pending' 
          }).sort({ createdAt: -1 });
        }
      }
      
      if (!payment) {
        console.log('⚠️ Could not find any payment matching callback data');
        return res.json({ ResultCode: 1, ResultDesc: "Payment not found" });
      }
      
      // Update payment with checkoutRequestId if found via phone
      payment.checkoutRequestId = checkoutRequestId;
    }

    // Update payment with result code and description
    payment.resultCode = resultCode;
    payment.resultDesc = stkCallback.ResultDesc || 'No description provided';

    if (resultCode === 0) {
      // Payment successful
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      let mpesaCode = 'N/A';
      let phoneNumber = payment.phoneNumber;
      let amount = payment.amount;

      // Extract M-Pesa code
      const mpesaReceiptItem = metadata.find(item => item.Name === 'MpesaReceiptNumber');
      if (mpesaReceiptItem && mpesaReceiptItem.Value) {
        mpesaCode = mpesaReceiptItem.Value;
      }

      // Extract phone number from callback if available
      const phoneItem = metadata.find(item => item.Name === 'PhoneNumber');
      if (phoneItem && phoneItem.Value) {
        phoneNumber = phoneItem.Value.toString();
      }

      // Extract amount from callback if available
      const amountItem = metadata.find(item => item.Name === 'Amount');
      if (amountItem && amountItem.Value) {
        amount = parseFloat(amountItem.Value);
      }

      payment.status = 'completed';
      payment.mpesaCode = mpesaCode;
      payment.phoneNumber = phoneNumber;
      payment.amount = amount;
      
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
      console.log(`✅ Payment completed for ${payment.phoneNumber}, M-Pesa Code: ${payment.mpesaCode}, Amount: KSh ${payment.amount}, Expires: ${payment.endTime}`);
      
    } else if (resultCode === 1032) {
      // User cancelled the payment
      payment.status = 'cancelled';
      await payment.save();
      console.log(`❌ Payment cancelled by user: ${payment.phoneNumber}`);
      
    } else if (resultCode === 1037) {
      // Request timeout
      payment.status = 'failed';
      await payment.save();
      console.log(`⏰ Payment timeout: ${payment.phoneNumber}`);
      
    } else if (resultCode === 2001) {
      // Insufficient balance
      payment.status = 'failed';
      await payment.save();
      console.log(`💰 Insufficient balance: ${payment.phoneNumber}`);
      
    } else {
      // Other errors
      payment.status = 'failed';
      await payment.save();
      console.log(`❌ Payment failed: ${payment.phoneNumber}, Code: ${resultCode}, Desc: ${stkCallback.ResultDesc}`);
    }

    // IMPORTANT: M-Pesa expects this exact response format
    const response = {
      ResultCode: 0,
      ResultDesc: "Success"
    };
    
    console.log('📱 Sending response to M-Pesa:', response);
    res.json(response);
    
  } catch (err) {
    console.error('❌ Callback processing error:', err.message);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ 
      ResultCode: 1, 
      ResultDesc: "Server error: " + err.message 
    });
  }
});

// ===== Health Check =====
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL
  });
});

// ===== Test Callback Endpoint (for debugging) =====
app.get('/api/test-callback', (req, res) => {
  res.json({ 
    message: 'Callback endpoint is ready',
    timestamp: new Date(),
    url: process.env.MPESA_CALLBACK_URL 
  });
});

app.post('/api/test-callback', express.json(), (req, res) => {
  console.log('🧪 Test callback received:', req.body);
  res.json({ 
    success: true, 
    message: 'Test callback received', 
    data: req.body,
    timestamp: new Date()
  });
});

// ===== Check Payment Status (for frontend polling) =====
app.get('/api/payment/status/:checkoutRequestId', async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    
    const payment = await Payment.findOne({ checkoutRequestId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    // Check if payment has expired (if it's completed but endTime passed)
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
    
    res.json({
      success: true,
      payment,
      isCurrentlyActive,
      remainingTime
    });
  } catch (err) {
    console.error('Error checking payment status:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===== Manual Payment Status Update (for testing) =====
app.post('/api/payment/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, mpesaCode } = req.body;
    
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    payment.status = status;
    if (mpesaCode) payment.mpesaCode = mpesaCode;
    
    if (status === 'completed') {
      const packageDurations = {
        'Basic': 1, 'Intermediate': 2, 'Big': 3, 
        'Mega': 4, 'Super': 5, 'DayOffer': 24
      };
      const durationHours = packageDurations[payment.package] || 1;
      payment.startTime = new Date();
      payment.endTime = new Date(Date.now() + (durationHours * 60 * 60 * 1000));
    }
    
    await payment.save();
    
    res.json({ success: true, payment });
  } catch (err) {
    console.error('Error updating payment:', err);
    res.status(500).json({ message: 'Server error' });
  }
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
    console.log('📊 Admin Dashboard: http://localhost:3000/service (login with admin/admin)');
    console.log('🎯 Admin Features:');
    console.log('   - Manual payment activation/deactivation');
    console.log('   - Payment deletion');
    console.log('   - Graphical analytics dashboard');
    console.log('   - Real-time status updates');
    console.log('\n⚠️  IMPORTANT: Make sure your .env file has:');
    console.log('   MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok-free.app/callback');
    console.log('\n🔧 Debug endpoints:');
    console.log(`   GET  http://localhost:${PORT}/api/health`);
    console.log(`   GET  http://localhost:${PORT}/api/test-callback`);
  });
});

// ===== Unhandled Promise Rejection Handler =====
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
  process.exit(1);
});