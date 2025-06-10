const axios = require('axios');
const btoa = require('btoa');

// M-Pesa configuration
const config = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE,
  passKey: process.env.MPESA_PASSKEY,
  authUrl: process.env.MPESA_AUTH_URL || 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
  stkPushUrl: process.env.MPESA_STK_PUSH_URL || 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
  callbackUrl: process.env.MPESA_CALLBACK_URL || ''https://your-ngrok-url.ngrok-free.app/callback''
};

class MPESATwo {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get M-Pesa OAuth token
   */
  async getAuthToken() {
    try {
      const auth = btoa(`${config.consumerKey}:${config.consumerSecret}`);
      const response = await axios.get(config.authUrl, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      return this.accessToken;
    } catch (error) {
      console.error('Error getting M-Pesa token:', error);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  /**
   * Initiate STK Push for Hotspot payment
   * @param {Object} paymentDetails - Payment details
   * @param {string} paymentDetails.phoneNumber - Customer phone number (format: 2547XXXXXXXX)
   * @param {number} paymentDetails.amount - Payment amount
   * @param {string} paymentDetails.accountReference - Payment reference
   * @param {string} paymentDetails.transactionDesc - Transaction description
   * @param {number} paymentDetails.hours - Hours of hotspot access
   */
  async initiateSTKPush(paymentDetails) {
    try {
      // Check if token is expired or doesn't exist
      if (!this.accessToken || Date.now() >= this.tokenExpiry) {
        await this.getAuthToken();
      }

      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const payload = {
        BusinessShortCode: config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: paymentDetails.amount,
        PartyA: paymentDetails.phoneNumber,
        PartyB: config.businessShortCode,
        PhoneNumber: paymentDetails.phoneNumber,
        CallBackURL: config.callbackUrl,
        AccountReference: paymentDetails.accountReference,
        TransactionDesc: paymentDetails.transactionDesc
      };

      const response = await axios.post(config.stkPushUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        message: 'STK Push initiated successfully',
        data: response.data,
        checkoutRequestID: response.data.CheckoutRequestID
      };
    } catch (error) {
      console.error('STK Push Error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.errorMessage || 'Failed to initiate STK Push',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Generate timestamp in required format (YYYYMMDDHHmmss)
   */
  generateTimestamp() {
    return new Date().toISOString().replace(/[-:.]/g, '').slice(0, -4);
  }

  /**
   * Generate password by base64 encoding shortcode + passkey + timestamp
   * @param {string} timestamp - Generated timestamp
   */
  generatePassword(timestamp) {
    const str = `${config.businessShortCode}${config.passKey}${timestamp}`;
    return btoa(str);
  }

  /**
   * Format phone number to 2547XXXXXXXX format
   * @param {string} phoneNumber - Raw phone number input
   */
  formatPhoneNumber(phoneNumber) {
    let formatted = phoneNumber.trim();
    
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    } else if (formatted.startsWith('+254')) {
      formatted = formatted.substring(1);
    } else if (formatted.startsWith('254')) {
      // Already in correct format
    } else {
      throw new Error('Invalid phone number format');
    }

    // Remove any non-digit characters
    formatted = formatted.replace(/\D/g, '');

    if (formatted.length !== 12) {
      throw new Error('Phone number must be 12 digits after formatting');
    }

    return formatted;
  }
}

module.exports = new MPESATwo();