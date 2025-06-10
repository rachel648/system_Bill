// routes/hotspotRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const btoa = require('btoa');

// STK Push endpoint
router.post('/hotspot-payment', async (req, res) => {
  try {
    const { phoneNumber, amount, hours } = req.body;

    // 1. Get M-Pesa OAuth token
    const auth = btoa(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`);
    const tokenResponse = await axios.get(
      process.env.MPESA_AUTH_URL, 
      { headers: { Authorization: `Basic ${auth}` } }
    );

    // 2. Prepare STK Push request
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.]/g, '')
      .slice(0, -4);
      
    const password = btoa(
      `${process.env.MPESA_BUSINESS_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    );

    const stkResponse = await axios.post(
      process.env.MPESA_STK_PUSH_URL,
      {
        BusinessShortCode: process.env.MPESA_BUSINESS_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: process.env.MPESA_BUSINESS_SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: `${process.env.BASE_URL}/mpesa-callback`,
        AccountReference: `HOTSPOT-${Date.now()}`,
        TransactionDesc: `Hotspot access for ${hours} hour(s)`
      },
      {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      message: 'STK Push initiated',
      data: stkResponse.data
    });

  } catch (error) {
    console.error('STK Push error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.errorMessage || 'Payment failed'
    });
  }
});

module.exports = router;