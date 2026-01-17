import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Packages.css';

const packagePrices = {
  Basic: 1,
  Intermediate: 20,
  Big: 30,
  Mega: 40,
  Super: 50,
  DayOffer: 80
};

const packageDurations = {
  Basic: '/ Hour',
  Intermediate: '/ 2 Hours',
  Big: '/ 3 Hours',
  Mega: '/ 4 Hours',
  Super: '/ 5 Hours',
  DayOffer: '24 Hours (Full Day)'
};

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-api.com' 
  : 'http://localhost:5000';

const Packages = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();

  const handleCardClick = (pkg) => {
    setSelectedPackage(pkg);
    setIsModalOpen(true);
    setError(null);
    setSuccessMessage(null);
  };

  const formatPhoneNumber = (phone) => {
    let formatted = phone.trim();
    formatted = formatted.replace(/\D/g, '');
    
    if (formatted.startsWith('254') && formatted.length === 12) {
      return formatted;
    }
    if (formatted.startsWith('07') && formatted.length === 10) {
      return '254' + formatted.substring(1);
    }
    if (formatted.startsWith('7') && formatted.length === 9) {
      return '254' + formatted;
    }
    return formatted;
  };

  const handlePayment = async () => {
    const phoneRegex = /^(?:\+?254|0)[17]\d{8}$/;
    const testNumber = phoneNumber.trim();
    
    if (!phoneRegex.test(testNumber)) {
      setError('Please enter a valid Safaricom number (e.g. 0712345678, 254712345678, or +254712345678)');
      return;
    }

    const formattedPhone = formatPhoneNumber(testNumber);
    if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
      setError('Invalid phone number format after conversion');
      return;
    }

    const amount = packagePrices[selectedPackage];
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
      if (!healthResponse.ok) {
        throw new Error('Backend service is not available');
      }

      const paymentResponse = await fetch(`${API_BASE_URL}/api/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          amount,
          package: selectedPackage,
        }),
      });

      const responseData = await paymentResponse.json();

      if (!paymentResponse.ok || !responseData.success) {
        throw new Error(responseData.message || 'Payment request failed');
      }

      setSuccessMessage(`Payment request sent to ${formattedPhone}. Complete payment on your phone. M-Pesa prompt will arrive shortly.`);
      
      // Auto-close modal after 5 seconds
      setTimeout(() => {
        setIsModalOpen(false);
        setPhoneNumber('');
        setSuccessMessage(null);
      }, 5000);

    } catch (err) {
      console.error('Payment Error:', err);
      let errorMessage = err.message;
      if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to the payment service. Please check:';
        errorMessage += '\n1. Your internet connection';
        errorMessage += '\n2. That the backend server is running';
        errorMessage += '\n3. That you have CORS enabled on the backend';
      }
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="packages-container">
      <div className="header-container">
        <div className="logo-container">
          <div className="animated-logo">
            <div className="logo-circle"></div>
            <div className="logo-pulse"></div>
          </div>
        </div>
        <h1 className="main-heading">WELCOME TO ELITE NETWORKS HOTSPOT</h1>
      </div>
      <h3 className="sub-heading">Select Your Package</h3>

      <button
        onClick={() => navigate('/service')}
        className="service-form-button"
      >
        Go to Service Form
      </button>

      <div className="packages-grid">
        {Object.keys(packagePrices).map((pkg) => (
          <div 
            key={pkg} 
            className={`package-card ${pkg.toLowerCase()}-card`} 
            onClick={() => handleCardClick(pkg)}
          >
            <h3 className="package-name">{pkg}</h3>
            <p className="package-price">KSh {packagePrices[pkg].toLocaleString()} {packageDurations[pkg]}</p>
            <p className="package-speed">5 Mbps</p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="payment-modal">
          <div className="modal-content">
            <button 
              className="modal-close-btn"
              onClick={() => {
                setIsModalOpen(false);
                setError(null);
                setSuccessMessage(null);
              }}
              disabled={isProcessing}
            >
              ×
            </button>
            
            <h3 className="modal-title">Make Payment for {selectedPackage}</h3>
            <label htmlFor="phone" className="modal-label">Enter Safaricom Number:</label>
            <input
              type="tel"
              id="phone"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                setError(null);
              }}
              placeholder="e.g. 0712345678, 254712345678, or +254712345678"
              disabled={isProcessing}
              maxLength="13"
              className="modal-input"
            />
            
            <p className="amount-display">
              Amount: KSh {packagePrices[selectedPackage].toLocaleString()}
            </p>
            
            {error && (
              <div className="error-message">
                {error.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
            
            {successMessage && (
              <div className="success-message">
                {successMessage}
              </div>
            )}
            
            <div className="modal-buttons">
              <button 
                onClick={handlePayment}
                disabled={isProcessing}
                className={`payment-button ${isProcessing ? 'processing' : ''}`}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : 'Submit Payment'}
              </button>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                disabled={isProcessing}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Packages;