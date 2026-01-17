require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');

const app = express();

// ===== MIDDLEWARE =====
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(morgan('dev'));
app.use(express.json());

// ===== DATABASE =====
const paymentSchema = new mongoose.Schema({
  phoneNumber: String,
  amount: Number,
  package: String,
  mpesaCode: String,
  status: { type: String, default: 'pending' },
  startTime: Date,
  endTime: Date,
  checkoutRequestId: String,
  transactionDate: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

// ===== CONNECT DATABASE =====
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/internet_billing', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.log('❌ MongoDB Error:', err.message));

// ===== ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date()
  });
});

// Make payment (REAL M-Pesa)
app.post('/api/payment', async (req, res) => {
  try {
    const { phone, amount, package } = req.body;
    
    // Save to database
    const payment = new Payment({
      phoneNumber: phone,
      amount: amount,
      package: package,
      status: 'pending'
    });
    
    await payment.save();
    console.log(`💰 Payment saved: ${phone}, KSh ${amount}, ${package}`);
    
    // REAL M-Pesa Sandbox Request
    const consumerKey = process.env.CONSUMER_KEY;
    const consumerSecret = process.env.CONSUMER_SECRET;
    
    if (!consumerKey || !consumerSecret) {
      throw new Error('M-Pesa credentials not set in .env file');
    }
    
    // Get access token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenResponse = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}` } }
    );
    
    const accessToken = tokenResponse.data.access_token;
    
    // Prepare STK Push
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const password = Buffer.from(
      '174379' + 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919' + timestamp
    ).toString('base64');
    
    const callbackUrl = process.env.MPESA_CALLBACK_URL || 'http://localhost:5000/callback';
    
    const stkResponse = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: '174379',
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: '174379',
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: 'Test Payment',
        TransactionDesc: 'Test'
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    // Save checkout ID
    payment.checkoutRequestId = stkResponse.data.CheckoutRequestID;
    await payment.save();
    
    res.json({
      success: true,
      message: 'STK Push sent to your phone',
      checkoutRequestId: stkResponse.data.CheckoutRequestID,
      paymentId: payment._id
    });
    
  } catch (error) {
    console.error('Payment error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Payment failed: ' + error.message
    });
  }
});

// M-Pesa Callback Handler (WORKING VERSION)
app.post('/callback', async (req, res) => {
  console.log('📱 M-Pesa Callback Received!', new Date().toISOString());
  
  try {
    const data = req.body;
    console.log('Callback data:', JSON.stringify(data, null, 2));
    
    if (data.Body?.stkCallback) {
      const callback = data.Body.stkCallback;
      const resultCode = callback.ResultCode;
      const checkoutId = callback.CheckoutRequestID;
      
      console.log(`ResultCode: ${resultCode}, CheckoutID: ${checkoutId}`);
      
      // Find payment
      let payment = await Payment.findOne({ checkoutRequestId: checkoutId });
      
      if (!payment) {
        console.log('Payment not found by checkout ID, searching recent...');
        payment = await Payment.findOne({ status: 'pending' }).sort({ createdAt: -1 });
      }
      
      if (payment) {
        if (resultCode === 0) {
          // SUCCESS
          payment.status = 'completed';
          payment.mpesaCode = callback.CallbackMetadata?.Item?.find(i => i.Name === 'MpesaReceiptNumber')?.Value || 'N/A';
          
          // Set times
          const hours = { 'Basic': 1, 'Intermediate': 2, 'Big': 3, 'Mega': 4, 'Super': 5, 'DayOffer': 24 }[payment.package] || 1;
          payment.startTime = new Date();
          payment.endTime = new Date(Date.now() + (hours * 60 * 60 * 1000));
          
          await payment.save();
          console.log(`✅ Payment completed: ${payment.phoneNumber}, Code: ${payment.mpesaCode}`);
        } else {
          // FAILED
          payment.status = 'failed';
          await payment.save();
          console.log(`❌ Payment failed: ${payment.phoneNumber}, Code: ${resultCode}`);
        }
      }
    }
    
    // ALWAYS return success to M-Pesa
    res.json({ ResultCode: 0, ResultDesc: "Success" });
    
  } catch (error) {
    console.error('Callback error:', error);
    res.json({ ResultCode: 0, ResultDesc: "Success" });
  }
});

// Get all payments for admin
app.get('/api/admin/payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ transactionDate: -1 });
    
    // Add active status
    const paymentsWithStatus = payments.map(p => {
      const isActive = p.status === 'completed' && p.endTime && new Date() < new Date(p.endTime);
      const remaining = isActive ? Math.round((new Date(p.endTime) - new Date()) / (1000 * 60)) : 0;
      
      return {
        ...p.toObject(),
        isCurrentlyActive: isActive,
        remainingTime: remaining
      };
    });
    
    res.json({ success: true, payments: paymentsWithStatus });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Complete payment manually (for testing)
app.post('/api/payment/:id/complete', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.json({ success: false, message: 'Payment not found' });
    }
    
    payment.status = 'completed';
    payment.mpesaCode = 'MPESA' + Date.now().toString().slice(-6);
    payment.startTime = new Date();
    
    const hours = { 'Basic': 1, 'Intermediate': 2, 'Big': 3, 'Mega': 4, 'Super': 5, 'DayOffer': 24 }[payment.package] || 1;
    payment.endTime = new Date(Date.now() + (hours * 60 * 60 * 1000));
    
    await payment.save();
    
    res.json({
      success: true,
      message: 'Payment completed',
      payment
    });
    
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;

// CRITICAL: Listen on ALL network interfaces
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('🚀 SERVER RUNNING - READY FOR M-PESA SANDBOX');
  console.log('='.repeat(60));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: Can be accessed from anywhere`);
  console.log(`📱 Callback URL: ${process.env.MPESA_CALLBACK_URL || 'NOT SET!'}`);
  console.log('');
  console.log('📊 Test endpoints:');
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   POST http://localhost:${PORT}/api/payment`);
  console.log(`   GET  http://localhost:${PORT}/api/admin/payments`);
  console.log('');
  console.log('💡 Make sure:');
  console.log('   1. Ngrok is running with correct URL');
  console.log('   2. .env has MPESA_CALLBACK_URL set');
  console.log('   3. M-Pesa sandbox credentials in .env');
  console.log('='.repeat(60));
});

// Handle errors
server.on('error', (err) => {
  console.error('Server error:', err.message);
});