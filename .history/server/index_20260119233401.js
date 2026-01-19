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
  resultDesc: String
}, {
  timestamps: true
});

// Create indexes
paymentSchema.index({ phoneNumber: 1 });
paymentSchema.index({ checkoutRequestId: 1 }, { sparse: true });
paymentSchema.index({ transactionDate: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ endTime: 1 });

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
    // Validate phone number format
    const phoneRegex = /^(?:254|\+254|0)?(7[0-9]{8})$/;
    const match = phone.match(phoneRegex);
    
    if (!match) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid phone number format. Use 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX' 
      });
    }

    // Format phone to 2547XXXXXXXX
    const formattedPhone = `254${match[1]}`;
    
    console.log(`💰 New payment request: ${formattedPhone}, ${amount}, ${package}`);

    // Save payment record first
    const payment = new Payment({
      phoneNumber: formattedPhone,
      amount: parseFloat(amount),
      package: package,
      status: 'pending',
      transactionDate: new Date()
    });
    await payment.save();

    console.log(`📝 Payment saved with ID: ${payment._id}`);

    // Generate M-Pesa access token
    const accessToken = await generateAccessToken();
    
    // Generate timestamp (YYYYMMDDHHMMSS)
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
                     String(now.getMonth() + 1).padStart(2, '0') +
                     String(now.getDate()).padStart(2, '0') +
                     String(now.getHours()).padStart(2, '0') +
                     String(now.getMinutes()).padStart(2, '0') +
                     String(now.getSeconds()).padStart(2, '0');

    // Generate password
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString('base64');

    // Prepare callback URL
    const callbackUrl = process.env.MPESA_CALLBACK_URL || `http://localhost:${process.env.PORT || 5000}/callback`;
    
    console.log(`📞 Sending STK Push to: ${formattedPhone}`);
    console.log(`📞 Callback URL: ${callbackUrl}`);

    const stkResponse = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: parseFloat(amount),
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: `ELITE-${package}`,
        TransactionDesc: `Payment for ${package} package`
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Update payment with request ID
    payment.requestId = stkResponse.data.MerchantRequestID;
    payment.checkoutRequestId = stkResponse.data.CheckoutRequestID;
    await payment.save();

    console.log(`✅ STK Push sent successfully!`);
    console.log(`   MerchantRequestID: ${stkResponse.data.MerchantRequestID}`);
    console.log(`   CheckoutRequestID: ${stkResponse.data.CheckoutRequestID}`);
    console.log(`   Response: ${stkResponse.data.ResponseDescription}`);

    res.status(200).json({
      success: true,
      message: 'STK Push request sent successfully. Please check your phone to complete payment.',
      data: {
        merchantRequestID: stkResponse.data.MerchantRequestID,
        checkoutRequestID: stkResponse.data.CheckoutRequestID,
        responseDescription: stkResponse.data.ResponseDescription,
        customerMessage: stkResponse.data.CustomerMessage
      },
      paymentId: payment._id
    });

  } catch (error) {
    console.error('❌ M-Pesa STK Push error:', error.response?.data || error.message);
    
    // Update payment status to failed
    try {
      const payment = await Payment.findOne({ phoneNumber: phone, status: 'pending' })
        .sort({ createdAt: -1 });
      if (payment) {
        payment.status = 'failed';
        payment.resultDesc = 'STK Push request failed: ' + (error.response?.data?.errorMessage || error.message);
        await payment.save();
      }
    } catch (dbErr) {
      console.error('Error updating payment status:', dbErr);
    }

    res.status(500).json({
      success: false,
      message: 'M-Pesa STK push failed',
      error: error.response?.data?.errorMessage || error.message
    });
  }
});

// ===== REAL M-Pesa Callback Handler =====
app.post('/callback', async (req, res) => {
  console.log('📱 M-Pesa Callback received at:', new Date().toISOString());
  
  try {
    const callbackData = req.body;
    
    if (!callbackData.Body || !callbackData.Body.stkCallback) {
      console.log('⚠️ Invalid callback format');
      return res.json({ ResultCode: 1, ResultDesc: "Invalid callback" });
    }

    const stkCallback = callbackData.Body.stkCallback;
    const resultCode = stkCallback.ResultCode;
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const merchantRequestId = stkCallback.MerchantRequestID;
    
    console.log(`🔍 Processing callback:`);
    console.log(`   CheckoutRequestID: ${checkoutRequestId}`);
    console.log(`   MerchantRequestID: ${merchantRequestId}`);
    console.log(`   ResultCode: ${resultCode}`);
    console.log(`   ResultDesc: ${stkCallback.ResultDesc}`);
    
    // Find payment by checkoutRequestId
    let payment = await Payment.findOne({ checkoutRequestId });
    
    if (!payment) {
      console.log(`⚠️ Payment not found for CheckoutRequestID: ${checkoutRequestId}`);
      console.log(`🔍 Searching by MerchantRequestID: ${merchantRequestId}`);
      
      // Try to find by merchantRequestId
      payment = await Payment.findOne({ requestId: merchantRequestId });
      
      if (!payment) {
        console.log(`❌ Payment not found for either ID`);
        return res.json({ ResultCode: 1, ResultDesc: "Payment not found" });
      }
      
      // Update with checkoutRequestId if found via merchantRequestId
      payment.checkoutRequestId = checkoutRequestId;
    }

    // Update payment with result code and description
    payment.resultCode = resultCode;
    payment.resultDesc = stkCallback.ResultDesc;

    if (resultCode === 0) {
      // Payment successful
      const items = stkCallback.CallbackMetadata?.Item || [];
      
      // Extract M-Pesa code
      const mpesaReceiptItem = items.find(item => item.Name === 'MpesaReceiptNumber');
      if (mpesaReceiptItem && mpesaReceiptItem.Value) {
        payment.mpesaCode = mpesaReceiptItem.Value;
        console.log(`✅ M-Pesa Code: ${payment.mpesaCode}`);
      }

      // Extract phone number from callback if available
      const phoneItem = items.find(item => item.Name === 'PhoneNumber');
      if (phoneItem && phoneItem.Value) {
        payment.phoneNumber = phoneItem.Value.toString();
        console.log(`📱 Phone: ${payment.phoneNumber}`);
      }

      // Extract amount from callback if available
      const amountItem = items.find(item => item.Name === 'Amount');
      if (amountItem && amountItem.Value) {
        payment.amount = parseFloat(amountItem.Value);
        console.log(`💰 Amount: KSh ${payment.amount}`);
      }

      // Extract transaction date
      const dateItem = items.find(item => item.Name === 'TransactionDate');
      if (dateItem && dateItem.Value) {
        // Convert M-Pesa date format (YYYYMMDDHHMMSS) to Date
        const dateStr = dateItem.Value.toString();
        if (dateStr.length === 14) {
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          const hour = dateStr.substring(8, 10);
          const minute = dateStr.substring(10, 12);
          const second = dateStr.substring(12, 14);
          payment.transactionDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
        }
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
      
      console.log(`✅ Payment completed successfully!`);
      console.log(`   Phone: ${payment.phoneNumber}`);
      console.log(`   Package: ${payment.package}`);
      console.log(`   Duration: ${durationHours} hours`);
      console.log(`   Start: ${payment.startTime}`);
      console.log(`   End: ${payment.endTime}`);
      
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

    // Always return success to M-Pesa
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
      ResultDesc: "Success" 
    });
  }
});

// ===== Health Check =====
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    const paymentCount = await Payment.countDocuments();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      dbStatus: dbStatus,
      totalPayments: paymentCount,
      mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
});

// ===== Test Database Connection =====
app.get('/api/test-db', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const statusText = dbStatus === 1 ? 'Connected' : 
                      dbStatus === 2 ? 'Connecting' :
                      dbStatus === 3 ? 'Disconnecting' : 'Disconnected';
    
    const paymentCount = await Payment.countDocuments();
    const pendingCount = await Payment.countDocuments({ status: 'pending' });
    const completedCount = await Payment.countDocuments({ status: 'completed' });
    
    res.json({
      success: true,
      database: {
        status: statusText,
        readyState: dbStatus,
        totalPayments: paymentCount,
        pendingPayments: pendingCount,
        completedPayments: completedCount,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== Check Payment Status =====
app.get('/api/payment/status/:checkoutRequestId', async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    
    const payment = await Payment.findOne({ checkoutRequestId });
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    // Check if payment is active
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
      payment: {
        id: payment._id,
        phoneNumber: payment.phoneNumber,
        amount: payment.amount,
        package: payment.package,
        status: payment.status,
        mpesaCode: payment.mpesaCode,
        checkoutRequestId: payment.checkoutRequestId,
        startTime: payment.startTime,
        endTime: payment.endTime,
        transactionDate: payment.transactionDate
      },
      isCurrentlyActive,
      remainingTime
    });
  } catch (err) {
    console.error('Error checking payment status:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// ===== Manual Payment Status Update =====
app.post('/api/payment/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, mpesaCode } = req.body;
    
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
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
    
    res.json({ 
      success: true, 
      message: 'Payment updated successfully',
      payment 
    });
  } catch (err) {
    console.error('Error updating payment:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
});

// ===== Database Connection =====
const connectDB = async () => {
  try {
    // Use 127.0.0.1 for better reliability
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/internet_billing';
    
    console.log('🔌 Connecting to MongoDB...');
    console.log(`📁 Database: ${mongoURI.split('/').pop().split('?')[0]}`);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connected successfully!');
    
    // Create indexes
    await Payment.createIndexes();
    await Admin.createIndexes();
    
    // Initialize admin user
    await initializeAdmin();
    
    console.log('✅ Database setup completed');
    
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Make sure MongoDB service is running:');
    console.log('   → net start MongoDB');
    console.log('2. Check your .env file:');
    console.log('   → MONGO_URI=mongodb://127.0.0.1:27017/internet_billing');
    console.log('3. Test MongoDB connection:');
    console.log('   → mongosh --eval "db.adminCommand(\'ping\')"');
    
    // Don't exit - server can run without DB for testing
    console.log('\n⚠️  Server starting WITHOUT database connection.');
    console.log('   Payments will not be saved until MongoDB is connected.');
  }
};

// ===== Start Server =====
const PORT = process.env.PORT || 5000;

// Connect to database first, then start server
connectDB().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌';
    
    console.log('\n' + '='.repeat(70));
    console.log('🚀 ELITE NETWORKS HOTSPOT - PRODUCTION SERVER');
    console.log('='.repeat(70));
    console.log(`📡 Server running on port: ${PORT}`);
    console.log(`🗄️  Database status: ${dbStatus}`);
    console.log(`🔗 Local access: http://localhost:${PORT}`);
    console.log(`🌐 Network access: http://YOUR-IP:${PORT}`);
    
    if (process.env.MPESA_CALLBACK_URL) {
      console.log(`📱 M-Pesa Callback URL: ${process.env.MPESA_CALLBACK_URL}`);
    } else {
      console.log('⚠️  MPESA_CALLBACK_URL not set in .env file');
    }
    
    console.log('\n📊 API Endpoints:');
    console.log(`   POST /api/payment              - Make payment`);
    console.log(`   GET  /api/payment/status/:id   - Check payment status`);
    console.log(`   POST /callback                 - M-Pesa callback`);
    console.log(`   GET  /api/health               - Health check`);
    console.log(`   GET  /api/test-db              - Test database`);
    
    console.log('\n👑 Admin Dashboard:');
    console.log(`   URL: http://localhost:3000/service`);
    console.log(`   Username: admin`);
    console.log(`   Password: admin`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ SERVER IS READY FOR REAL-TIME PAYMENTS!');
    console.log('='.repeat(70));
  });
  
  // Handle server errors
  server.on('error', (err) => {
    console.error('❌ Server error:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
      console.error('Solution: Change PORT in .env file to 5001 or another port');
    }
  });
  
}).catch(err => {
  console.error('❌ Failed to start server:', err);
});

// ===== Graceful shutdown =====
process.on('SIGINT', async () => {
  console.log('\n🔻 Shutting down server gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔻 Server termination requested...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});

// ===== Unhandled Promise Rejection Handler =====
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err.message);
});

