require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database
mongoose.connect('mongodb://127.0.0.1:27017/internet_billing', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Payment = mongoose.model('Payment', {
  phoneNumber: String,
  amount: Number,
  package: String,
  mpesaCode: String,
  status: String,
  startTime: Date,
  endTime: Date,
  createdAt: { type: Date, default: Date.now }
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' 
  });
});

// Make payment
app.post('/api/payment', async (req, res) => {
  try {
    const payment = new Payment({
      phoneNumber: req.body.phone,
      amount: req.body.amount,
      package: req.body.package,
      status: 'pending'
    });
    
    await payment.save();
    console.log(`Payment saved: ${req.body.phone}`);
    
    res.json({ 
      success: true, 
      message: 'Payment received', 
      paymentId: payment._id 
    });
    
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// M-Pesa callback (REAL one that works)
app.post('/callback', (req, res) => {
  console.log('📱 REAL M-Pesa callback received!');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  // ALWAYS respond successfully
  res.json({ 
    ResultCode: 0, 
    ResultDesc: "Success" 
  });
});

// Get payments
app.get('/api/admin/payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// Complete payment manually
app.post('/api/complete/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.json({ success: false, message: 'Not found' });
    }
    
    payment.status = 'completed';
    payment.mpesaCode = req.body.mpesaCode || `MPE${Date.now().toString().slice(-6)}`;
    payment.startTime = new Date();
    
    // Set end time
    const hours = { 'Basic':1, 'Intermediate':2, 'Big':3, 'Mega':4, 'Super':5, 'DayOffer':24 }[payment.package] || 1;
    payment.endTime = new Date(Date.now() + (hours * 60 * 60 * 1000));
    
    await payment.save();
    
    res.json({ 
      success: true, 
      message: 'Completed', 
      payment 
    });
    
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log(`✅ SERVER RUNNING ON PORT ${PORT}`);
  console.log('='.repeat(60));
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`🌐 http://YOUR-IP:${PORT}`);
  console.log('📱 Ready for M-Pesa callbacks!');
  console.log('='.repeat(60));
});