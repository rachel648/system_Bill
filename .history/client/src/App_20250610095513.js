require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { stkPush, healthCheck } = require('./mpesa');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Security and middleware setup
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(ENVIRONMENT === 'development' ? 'dev' : 'combined'));

// Static files (if serving React build)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.get('/api/health', healthCheck);
app.post('/api/mpesa/payment', apiLimiter, stkPush);

// M-Pesa callback handler with validation
app.post('/api/mpesa/callback', (req, res) => {
  try {
    const callbackData = req.body;
    
    if (!callbackData) {
      console.error('Empty callback received');
      return res.status(400).json({ error: 'Empty callback data' });
    }

    console.log('M-Pesa Callback Received:', JSON.stringify(callbackData, null, 2));
    
    // Process the callback (in a real app, you'd save this to a database)
    if (callbackData.Body?.stkCallback?.ResultCode === '0') {
      console.log('✅ Payment successful:', callbackData.Body.stkCallback);
    } else {
      console.error('❌ Payment failed:', callbackData.Body?.stkCallback?.ResultDesc);
    }

    res.status(200).json({ status: 'Callback processed successfully' });
  } catch (error) {
    console.error('Callback processing error:', error);
    res.status(500).json({ error: 'Internal server error processing callback' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: ENVIRONMENT === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running in ${ENVIRONMENT} mode on port ${PORT}`);
  console.log(`M-Pesa Environment: ${process.env.MPESA_ENVIRONMENT || 'sandbox'}`);
});

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});