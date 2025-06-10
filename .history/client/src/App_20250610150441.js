
const express = require('express');
const cors = require('cors');
const { stkPush, healthCheck } = require('./mpesa');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', healthCheck);
app.post('/api/mpesa/payment', stkPush);

// Simple callback handler for testing
app.post('/mpesa-callback', (req, res) => {
  console.log('M-Pesa Callback:', req.body);
  res.status(200).json({ status: 'received' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`M-Pesa Environment: ${process.env.MPESA_ENVIRONMENT || 'sandbox'}`);
});

