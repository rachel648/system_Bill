const axios = require('axios');
const moment = require('moment');
// const crypto = require('crypto');

// Environment variables
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '174379'; // Sandbox default
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || 'your_sandbox_passkey';
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || 'your_sandbox_consumer_key';
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || 'your_sandbox_consumer_secret';
const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT || 'sandbox';

const generateToken = async () => {
  const url = MPESA_ENVIRONMENT === 'production' 
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  const buffer = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  const credentials = buffer.toString('base64');

  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Token Generation Error:', error.response?.data || error.message);
    throw new Error('Failed to generate M-Pesa token');
  }
};

const stkPush = async (req, res) => {
  const { phone, amount, package: packageName } = req.body;
  
  // Basic validation
  if (!phone || !amount || !packageName) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields (phone, amount, package)'
    });
  }

  try {
    const token = await generateToken();
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
    
    // For testing, we'll use a mock callback URL that always returns success
    const callBackURL = MPESA_ENVIRONMENT === 'production'
      ? 'https://yourdomain.com/mpesa-callback'
      : 'https://example.com/mpesa-callback'; // This can be any URL for sandbox

    const response = await axios.post(
      MPESA_ENVIRONMENT === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: callBackURL,
        AccountReference: `NET-${packageName}`,
        TransactionDesc: 'Internet Package Payment'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    // For sandbox, we'll simulate success even without a real callback URL
    if (MPESA_ENVIRONMENT === 'sandbox') {
      return res.status(200).json({
        success: true,
        message: 'STK push initiated successfully (sandbox mode)',
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
      message: 'STK push initiated successfully',
      data: response.data
    });

  } catch (error) {
    console.error('M-Pesa STK Error:', error.response?.data || error.message);
    
    // More detailed error handling
    let errorMessage = 'Failed to initiate payment';
    if (error.response) {
      errorMessage = error.response.data?.errorMessage || 
                    error.response.data?.error || 
                    error.response.statusText;
    } else if (error.request) {
      errorMessage = 'No response from M-Pesa API';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      errorCode: error.response?.status || 500
    });
  }
};

// Add a health check endpoint
const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'M-Pesa Integration',
    environment: MPESA_ENVIRONMENT,
    timestamp: new Date().toISOString()
  });
};

module.exports = { stkPush, healthCheck };