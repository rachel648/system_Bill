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
// IMPORTANT: Raw text middleware for M-Pesa callback must come first
app.use(express.raw({ type: '*/*' })); // This handles M-Pesa's raw data

// Now add JSON middleware for other routes
app.use(express.json());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true
}));

app.use(morgan('dev'));
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
    enum: ['pending', 'completed', 'failed', 'cancelled', 'expired'],
    default: 'pending'
  },
  startTime: { type: Date },
  endTime: { type: Date },
  requestId: String,
  checkoutRequestId: String,
  transactionDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  resultCode: Number,
  resultDesc: String,
  callbackReceived: { type: Boolean, default: false }
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

    console.log(`📱 Creating payment for ${phone}, amount: ${amount}, package: ${package}`);

    const accessToken = await generateAccessToken();
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);

    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString('base64');

    const callbackUrl = process.env.MPESA_CALLBACK_URL || `http://localhost:${process.env.PORT || 5000}/callback`;
    console.log(`📞 Callback URL: ${callbackUrl}`);

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
        CallBackURL: callbackUrl,
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

    console.log(`✅ STK Push sent to ${phone}, CheckoutRequestID: ${stkResponse.data.CheckoutRequestID}`);

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
  console.log('📱 M-Pesa Callback received');
  
  try {
    // M-Pesa sends the data as raw text
    const rawBody = req.body.toString();
    console.log('📱 Raw callback body:', rawBody);
    
    let callbackData;
    try {
      callbackData = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error('❌ Failed to parse callback as JSON:', parseErr.message);
      // Send success response anyway to avoid M-Pesa retries
      return res.json({ 
        ResultCode: 0, 
        ResultDesc: "Success (parse error)" 
      });
    }
    
    console.log('📱 Parsed callback data:', JSON.stringify(callbackData, null, 2));

    // Extract STK callback
    const stkCallback = callbackData.Body?.stkCallback;
    if (!stkCallback) {
      console.log('⚠️ No STK callback in data');
      return res.json({ ResultCode: 0, ResultDesc: "Success (no stkCallback)" });
    }

    const resultCode = parseInt(stkCallback.ResultCode);
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    
    if (!checkoutRequestId) {
      console.log('⚠️ No CheckoutRequestID in callback');
      return res.json({ ResultCode: 0, ResultDesc: "Success (no CheckoutRequestID)" });
    }

    console.log(`🔍 Looking for payment with CheckoutRequestID: ${checkoutRequestId}`);

    // Find payment by checkoutRequestId
    let payment = await Payment.findOne({ checkoutRequestId });
    
    if (!payment) {
      console.log(`⚠️ Payment not found for CheckoutRequestID: ${checkoutRequestId}`);
      
      // Try to find by phone number from callback metadata
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      const phoneItem = metadata.find(item => item.Name === 'PhoneNumber');
      
      if (phoneItem && phoneItem.Value) {
        const phone = phoneItem.Value.toString();
        console.log(`🔍 Trying to find payment by phone: ${phone}`);
        
        // Find the latest pending payment for this phone
        payment = await Payment.findOne({ 
          phoneNumber: phone, 
          status: 'pending' 
        }).sort({ createdAt: -1 });
        
        if (payment) {
          console.log(`✅ Found payment by phone, updating CheckoutRequestID`);
          payment.checkoutRequestId = checkoutRequestId;
        }
      }
      
      if (!payment) {
        console.log(`❌ Could not find any payment for this callback`);
        return res.json({ ResultCode: 0, ResultDesc: "Success (payment not found)" });
      }
    }

    // Update payment with callback data
    payment.callbackReceived = true;
    payment.resultCode = resultCode;
    payment.resultDesc = stkCallback.ResultDesc || 'No description provided';

    if (resultCode === 0) {
      // Payment successful
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      
      // Extract M-Pesa code
      const mpesaReceiptItem = metadata.find(item => item.Name === 'MpesaReceiptNumber');
      if (mpesaReceiptItem && mpesaReceiptItem.Value) {
        payment.mpesaCode = mpesaReceiptItem.Value;
      }

      // Extract phone number from callback if available
      const phoneItem = metadata.find(item => item.Name === 'PhoneNumber');
      if (phoneItem && phoneItem.Value) {
        payment.phoneNumber = phoneItem.Value.toString();
      }

      // Extract amount from callback if available
      const amountItem = metadata.find(item => item.Name === 'Amount');
      if (amountItem && amountItem.Value) {
        payment.amount = parseFloat(amountItem.Value);
      }

      payment.status = 'completed';
      
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
      
      console.log(`✅ Payment completed for ${payment.phoneNumber}`);
      console.log(`   M-Pesa Code: ${payment.mpesaCode}`);
      console.log(`   Amount: KSh ${payment.amount}`);
      console.log(`   Package: ${payment.package}`);
      console.log(`   Expires: ${payment.endTime}`);
      
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
      console.log(`❌ Payment failed: ${payment.phoneNumber}, Code: ${resultCode}`);
    }

    // IMPORTANT: Always return success to M-Pesa to stop retries
    console.log('📱 Sending success response to M-Pesa');
    res.json({ 
      ResultCode: 0, 
      ResultDesc: "Success" 
    });
    
  } catch (err) {
    console.error('❌ Callback processing error:', err.message);
    console.error('❌ Error stack:', err.stack);
    
    // Always return success to M-Pesa even on error
    res.json({ 
      ResultCode: 0, 
      ResultDesc: "Success (server error handled)" 
    });
  }
});

// ===== Health Check with detailed info =====
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    port: process.env.PORT || 5000,
    mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL || 'Not set',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ===== Test Callback Endpoints =====
app.get('/callback/test', (req, res) => {
  res.json({ 
    message: 'Callback endpoint is ready for testing',
    method: 'GET',
    timestamp: new Date().toISOString(),
    note: 'M-Pesa will POST to this endpoint'
  });
});

app.post('/callback/test', async (req, res) => {
  console.log('🧪 Test POST callback received:', req.body);
  
  // Simulate a successful payment
  const testPayment = new Payment({
    phoneNumber: '254712345678',
    amount: 1,
    package: 'Basic',
    status: 'completed',
    mpesaCode: `TEST-${Date.now()}`,
    startTime: new Date(),
    endTime: new Date(Date.now() + (60 * 60 * 1000)), // 1 hour
    checkoutRequestId: `TEST-${Date.now()}`
  });
  
  await testPayment.save();
  
  res.json({ 
    success: true, 
    message: 'Test callback processed',
    paymentId: testPayment._id,
    timestamp: new Date().toISOString()
  });
});

// ===== Database Connection =====
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/elite_networks', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    console.log('✅ MongoDB connected successfully');

    // Create indexes
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

// Make sure we can accept connections
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`🔗 Network: http://0.0.0.0:${PORT}`);
  
  if (process.env.MPESA_CALLBACK_URL) {
    console.log(`📱 M-Pesa Callback URL: ${process.env.MPESA_CALLBACK_URL}`);
  } else {
    console.log('⚠️  MPESA_CALLBACK_URL not set in .env file!');
  }
  
  console.log('\n📊 Health check:');
  console.log(`   GET http://localhost:${PORT}/api/health`);
  console.log('\n🔧 Debug endpoints:');
  console.log(`   GET  http://localhost:${PORT}/callback/test`);
  console.log(`   POST http://localhost:${PORT}/callback/test`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try a different port.`);
    process.exit(1);
  }
});

// ===== Unhandled Promise Rejection Handler =====
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
});