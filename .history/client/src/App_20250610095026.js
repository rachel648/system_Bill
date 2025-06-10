require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { stkPush, healthCheck } = require('./mpesa');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // HTTP request logger

// Basic request validation middleware
const validateRequest = (req, res, next) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(400).json({ 
      success: false,
      message: 'Content-Type must be application/json'
    });
  }
  next();
};

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'M-Pesa Integration Service',
    environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.post('/api/mpesa/payment', validateRequest, async (req, res) => {
  // Additional validation for payment requests
  if (!req.body.phone || !req.body.amount || !req.body.package) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: phone, amount, package'
    });
  }

  try {
    await stkPush(req, res);
  } catch (error) {
    console.error('Unhandled payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during payment processing'
    });
  }
});

// Enhanced callback handler
app.post('/mpesa-callback', validateRequest, (req, res) => {
  try {
    console.log('M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));
    
    // Basic validation of callback
    if (!req.body.Body || !req.body.Body.stkCallback) {
      console.warn('Invalid callback structure received');
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid callback structure'
      });
    }

    const callbackData = req.body.Body.stkCallback;
    console.log('Callback Metadata:', {
      merchantRequestID: callbackData.MerchantRequestID,
      checkoutRequestID: callbackData.CheckoutRequestID,
      resultCode: callbackData.ResultCode,
      resultDesc: callbackData.ResultDesc
    });

    // Always respond with success to M-Pesa
    res.status(200).json({ 
      status: 'success',
      message: 'Callback processed successfully'
    });

    // Here you would typically:
    // 1. Verify the payment status
    // 2. Update your database
    // 3. Notify the user
  } catch (error) {
    console.error('Callback processing error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error processing callback'
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Server startup
app.listen(PORT, () => {
  console.log(`\nServer running on port ${PORT}`);
  console.log(`Environment: ${process.env.MPESA_ENVIRONMENT || 'sandbox'}`);
  console.log(`Allowed Origins: ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});