require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// ===== SIMPLE MIDDLEWARE =====
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// ===== DATABASE MODELS =====
const paymentSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  package: { type: String, required: true },
  mpesaCode: String,
  status: { type: String, default: 'pending' },
  startTime: { type: Date },
  endTime: { type: Date },
  checkoutRequestId: String,
  transactionDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' }
});

const Admin = mongoose.model('Admin', adminSchema);

// ===== SIMPLE DATABASE CONNECTION =====
const connectDB = async () => {
  try {
    console.log('🔄 Connecting to database...');
    
    // Use the connection string from .env file
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/internet_billing';
    console.log('📁 Database: internet_billing');
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Database connected!');
    
    // Create admin user if not exists
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await Admin.create({
        username: 'admin',
        password: hashedPassword
      });
      console.log('👑 Admin user created (username: admin, password: admin)');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 FIX THIS:');
    console.log('1. Make sure MongoDB is running');
    console.log('2. Check your .env file has:');
    console.log('   MONGO_URI=mongodb://127.0.0.1:27017/internet_billing');
    console.log('3. Or create the database manually:');
    console.log('   a. Open new PowerShell');
    console.log('   b. Run: cd "C:\\Program Files\\MongoDB\\Server\\*\\bin"');
    console.log('   c. Run: .\\mongo.exe');
    console.log('   d. Run: use internet_billing');
    console.log('   e. Run: exit()');
  }
};

// ===== SIMPLE ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date()
  });
});

// Test database
app.get('/api/test-db', async (req, res) => {
  try {
    const paymentCount = await Payment.countDocuments();
    res.json({
      success: true,
      message: 'Database is working',
      paymentCount: paymentCount,
      dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Database error: ' + error.message
    });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      return res.json({ success: false, message: 'Admin not found' });
    }
    
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.json({ success: false, message: 'Wrong password' });
    }
    
    const token = jwt.sign(
      { username: admin.username },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token: token,
      admin: { username: admin.username }
    });
    
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Get all payments
app.get('/api/admin/payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json({ success: true, payments: payments });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// M-Pesa payment
app.post('/api/payment', async (req, res) => {
  try {
    const { phone, amount, package } = req.body;
    
    // Save payment to database
    const payment = new Payment({
      phoneNumber: phone,
      amount: amount,
      package: package,
      status: 'pending'
    });
    
    await payment.save();
    
    console.log(`💰 Payment saved: ${phone}, ${amount}, ${package}`);
    
    // SIMULATE SUCCESSFUL PAYMENT (for testing)
    // Remove this in production
    setTimeout(async () => {
      payment.status = 'completed';
      payment.mpesaCode = 'TEST' + Date.now();
      payment.startTime = new Date();
      
      // Set end time based on package
      const hours = {
        'Basic': 1, 'Intermediate': 2, 'Big': 3,
        'Mega': 4, 'Super': 5, 'DayOffer': 24
      }[package] || 1;
      
      payment.endTime = new Date(Date.now() + (hours * 60 * 60 * 1000));
      await payment.save();
      console.log(`✅ Payment auto-completed: ${phone}`);
    }, 5000); // Auto-complete after 5 seconds for testing
    
    res.json({
      success: true,
      message: 'Payment request received',
      paymentId: payment._id
    });
    
  } catch (error) {
    console.error('Payment error:', error);
    res.json({ success: false, message: error.message });
  }
});

// M-Pesa callback (simplified)
app.post('/callback', async (req, res) => {
  console.log('📱 M-Pesa callback received');
  console.log('Body:', req.body);
  
  // Always send success to M-Pesa
  res.json({ ResultCode: 0, ResultDesc: "Success" });
});

// Manual payment update (for testing)
app.post('/api/update-payment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.json({ success: false, message: 'Payment not found' });
    }
    
    payment.status = status || 'completed';
    payment.mpesaCode = payment.mpesaCode || 'MANUAL' + Date.now();
    
    if (status === 'completed') {
      payment.startTime = new Date();
      const hours = {
        'Basic': 1, 'Intermediate': 2, 'Big': 3,
        'Mega': 4, 'Super': 5, 'DayOffer': 24
      }[payment.package] || 1;
      payment.endTime = new Date(Date.now() + (hours * 60 * 60 * 1000));
    }
    
    await payment.save();
    
    res.json({
      success: true,
      message: 'Payment updated',
      payment: payment
    });
    
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ===== START SERVER =====
const startServer = async () => {
  // Connect to database first
  await connectDB();
  
  // Start server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🚀 SERVER STARTED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    console.log(`🌐 Network: http://YOUR-IP:${PORT}`);
    console.log('');
    console.log('📊 Test endpoints:');
    console.log(`   GET  http://localhost:${PORT}/api/health`);
    console.log(`   GET  http://localhost:${PORT}/api/test-db`);
    console.log('');
    console.log('👑 Admin login:');
    console.log('   Username: admin');
    console.log('   Password: admin');
    console.log('='.repeat(50));
  });
};

startServer();