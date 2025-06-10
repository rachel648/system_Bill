import React, { useState } from 'react';
import axios from 'axios';
import './Hotspot.css';

const Hotspot = () => {
  const [hours, setHours] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const ratePerHour = 20;
  const totalAmount = hours * ratePerHour;

  const handleInputChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setHours(value);
    } else {
      setHours(0);
    }
  };

  const handlePhoneNumberChange = (e) => {
    setPhoneNumber(e.target.value);
  };

  const handlePayClick = () => {
    if (hours > 0) {
      setShowModal(true);
    } else {
      alert("Please enter at least 1 hour.");
    }
  };

  const handleConfirmPayment = async () => {
  if (!phoneNumber) {
    alert("Please enter your phone number");
    return;
  }

  setIsLoading(true);
  setPaymentStatus(null);

  try {
    // Format phone number
    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.substring(1);
    }

    const response = await axios.post('/api/hotspot/stk-push', {
      phoneNumber: formattedPhone,
      amount: totalAmount,
      hours: hours
    });

    if (response.data.success) {
      setPaymentStatus('success');
      alert(`STK Push sent to ${formattedPhone}. Please complete payment on your phone.`);
    } else {
      setPaymentStatus('error');
      alert(response.data.message || 'Payment initiation failed');
    }
  } catch (error) {
    console.error('Payment error:', error);
    setPaymentStatus('error');
    alert(error.response?.data?.message || 'Payment failed. Please try again.');
  } finally {
    setIsLoading(false);
    setShowModal(false);
  }
};
  return (
    <div className="hotspot-container">
      <h2>Hotspot Internet Payment</h2>
      <p className="description">Pay only <strong>KES {ratePerHour}</strong> per hour for high-speed Wi-Fi.</p>

      <div className="input-group">
        <label htmlFor="hours">Enter Hours:</label>
        <input 
          type="number" 
          id="hours" 
          value={hours} 
          min="1"
          onChange={handleInputChange}
          placeholder="Number of hours"
        />
      </div>

      <div className="total-display">
        Total Amount: <span>KES {totalAmount}</span>
      </div>

      <button className="pay-btn" onClick={handlePayClick}>Proceed to Pay</button>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Confirm Payment</h3>
            <p>You are about to pay <strong>KES {totalAmount}</strong> for <strong>{hours} hour(s)</strong> of hotspot access.</p>
            
            <div className="input-group">
              <label htmlFor="phone">M-Pesa Phone Number:</label>
              <input 
                type="tel" 
                id="phone" 
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                placeholder="e.g., 07XXXXXXXX or 2547XXXXXXXX"
              />
            </div>

            <div className="modal-buttons">
              <button 
                onClick={handleConfirmPayment}
                disabled={isLoading}
                className={isLoading ? 'loading' : ''}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span> Processing...
                  </>
                ) : 'Confirm Payment'}
              </button>
              <button 
                onClick={() => setShowModal(false)} 
                className="cancel-btn"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>

            {paymentStatus === 'error' && (
              <p className="error-message">Payment failed. Please try again.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Hotspot;