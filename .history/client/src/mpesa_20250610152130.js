const axios = require('axios');
const moment = require('moment');

// ---- SANDBOX CONFIGURATION ---- //
const MPESA_SHORTCODE = '174379'; // Always 174379 in sandbox
const MPESA_PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const MPESA_CONSUMER_KEY = 'qugWDUS22ly2srv9LGCPGQbJEgCBBoh3VUPYhqeBzcnohU4K'; // Replace this
const MPESA_CONSUMER_SECRET = 'dAF0Drk6t8WgG0FcWmsgSnyB1oiZ0juK4euuVv5di0Gf414KGeWBQKII1RWPVf3k'; // Replace this
const CALLBACK_URL = ' https://f646-105-163-157-62.ngrok-free.app/callback'; // Replace with a live/public URL
const BASE_URL = 'https://sandbox.safaricom.co.ke';

// ---- GENERATE ACCESS TOKEN ---- //
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

// ---- STK PUSH ---- //
const stkPush = async (req, res) => {
  const { phone, amount, package: packageName } = req.body;

  if (!phone || !amount || !packageName) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: phone, amount, package'
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
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: `NET-${packageName}`,
      TransactionDesc: 'Internet Package Payment'
    };

    const response = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    res.status(200).json({
      success: true,
      message: '✅ STK Push sent successfully (sandbox)',
      data: response.data
    });
  } catch (error) {
    const err = error.response?.data || error.message;
    console.error('❌ STK Push Error:', err);

    res.status(error.response?.status || 500).json({
      success: false,
      message: err?.errorMessage || err?.message || 'Unknown error',
      error: err
    });
  }
};

// ---- HEALTH CHECK ---- //
const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'M-Pesa Daraja Sandbox Integration',
    environment: 'sandbox',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  stkPush,
  healthCheck
};
