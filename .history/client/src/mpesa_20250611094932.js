const axios = require('axios');
const moment = require('moment');
const crypto = require('crypto');

// Configuration - Update these with your actual credentials
const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT || 'sandbox';
const BASE_URL = MPESA_ENVIRONMENT === 'production' 
  ? 'https://api.safaricom.co.ke' 
  : 'https://sandbox.safaricom.co.ke';

const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '174379';
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || 'qugWDUS22ly2srv9LGCPGQbJEgCBBoh3VUPYhqeBzcnohU4K';
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || 'dAF0Drk6t8WgG0FcWmsgSnyB1oiZ0juK4euuVv5di0Gf414KGeWBQKII1RWPVf3k';
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://your-ngrok-url.ngrok-free.app/callback';
const BASE_URL = 'https://sandbox.safaricom.co.ke';

// Generate Access Token
const generateToken = async () => {
  const url = `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`;
  const credentials = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${credentials}`
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Token Generation Error:', error.response?.data || error.message);
    throw new Error('Failed to generate M-Pesa token');
  }
};

// STK Push
const stkPush = async (req, res) => {
  const { phone, amount, package: packageName } = req.body;

  // Validation
  if (!phone || !amount || !packageName) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: phone, amount, package'
    });
  }

  // Validate phone number format (should be 254...)
  if (!phone.startsWith('254') || phone.length !== 12) {
    return res.status(400).json({
      success: false,
      message: 'Phone number must be in 2547XXXXXXXX format'
    });
  }

  try {
    const token = await generateToken();
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

    const payload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: 174379, // M-Pesa Paybill number
      PhoneNumber: phone,
      CallBackURL: https://f646-105-163-157-62.ngrok-free.app/callback,
      AccountReference: `NET-${MY_ENTERPRISE}`,
      TransactionDesc: 'Pay to Internet Package'
    };

    const response = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // For sandbox, simulate successful response
    if (MPESA_ENVIRONMENT === 'sandbox') {
      return res.status(200).json({
        success: true,
        message: 'STK Push initiated successfully (sandbox mode)',
        data: {
          ...response.data,
          sandbox: true,
          simulatedCallback: true
        }
      });
    }

    // For production
    res.status(200).json({
      success: true,
      message: 'STK Push initiated successfully',
      data: response.data
    });

  } catch (error) {
    console.error('❌ STK Push Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.response?.data || error.message
    });
  }
};

// Health Check
const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'M-Pesa Integration Service',
    environment: MPESA_ENVIRONMENT,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
};

module.exports = { stkPush, healthCheck };