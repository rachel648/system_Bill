const axios = require('axios');
const moment = require('moment');
const crypto = require('crypto');

// Configuration
const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT || 'sandbox';
const BASE_URL = MPESA_ENVIRONMENT === 'production' 
  ? 'https://api.safaricom.co.ke' 
  : 'https://sandbox.safaricom.co.ke';

const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '200521'; // Your till number
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || 'your_sandbox_consumer_key';
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || 'your_sandbox_consumer_secret';
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://your-ngrok-url.ngrok-free.app/callback';

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

// STK Push Function
const stkPush = async (req, res) => {
  const { phone, amount, package: packageName } = req.body;

  // Validation
  if (!phone || !amount || !packageName) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: phone, amount, package'
    });
  }

  // Validate phone number format (254XXXXXXXXX)
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
      BusinessShortCode: MPESA_SHORTCODE, // Your till number 200521
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline', // Changed for till number
      Amount: amount,
      PartyA: phone, // Customer phone
      PartyB: MPESA_SHORTCODE, // Your till number 200521
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: 'Internet Service', // Updated business name
      TransactionDesc: 'Payment to MY_INTERNET_SERVICES' // Updated description
    };

    const response = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Sandbox simulation
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

    // Production response
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

// Callback Handler (Add this new function)
const handleCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log('📞 Payment Callback Received:', callbackData);
    
    // Validate the callback
    if (callbackData.Body.stkCallback.ResultCode === 0) {
      console.log('✅ Payment Successful:', callbackData);
      // Process successful payment here (update database, etc.)
    } else {
      console.log('❌ Payment Failed:', callbackData.Body.stkCallback.ResultDesc);
    }
    
    res.status(200).end();
  } catch (error) {
    console.error('❌ Callback Processing Error:', error);
    res.status(500).end();
  }
};

// Health Check
const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'M-Pesa Internet Service', // Updated service name
    environment: MPESA_ENVIRONMENT,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    business: 'MY_INTERNET_SERVICES' // Added business identification
  });
};

module.exports = { 
  stkPush, 
  handleCallback, 
  healthCheck,
  generateToken // Exposed for testing if needed
};