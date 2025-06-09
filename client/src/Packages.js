import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Packages.css';

const packagePrices = {
  Basic: 1500,
  Intermediate: 2000,
  Big: 3000,
  Mega: 6000,
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
  const navigate = useNavigate();

  const handleCardClick = (pkg) => {
    setSelectedPackage(pkg);
    setIsModalOpen(true);
    setError(null);
  };

  const formatPhoneNumber = (phone) => {
    let formatted = phone.trim();
    formatted = formatted.replace(/\D/g, '');
    
    if (formatted.startsWith('0')) {
      return '254' + formatted.substring(1);
    } else if (formatted.startsWith('254')) {
      return formatted;
    } else if (formatted.length === 9) {
      return '254' + formatted;
    }
    return formatted;
  };

  const handlePayment = async () => {
    // Validate phone number
    const phoneRegex = /^0[17]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError('Please enter a valid Safaricom number (e.g. 0712345678)');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const amount = packagePrices[selectedPackage];
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Check backend health first
      const healthResponse = await fetch(`${API_BASE_URL}/api/health`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!healthResponse.ok) {
        throw new Error('Backend service is not available');
      }

      // 2. Initiate payment
      const paymentResponse = await fetch(`${API_BASE_URL}/api/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          amount,
          package: selectedPackage,
          timestamp: new Date().toISOString(),
        }),
      });

      // Handle response
      const contentType = paymentResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await paymentResponse.text();
        throw new Error(`Unexpected response: ${text.substring(0, 100)}`);
      }

      const responseData = await paymentResponse.json();

      if (!paymentResponse.ok || !responseData.success) {
        throw new Error(responseData.message || 'Payment request failed');
      }

      // Success case
      alert(`Payment request sent to ${formattedPhone}. Complete payment on your phone`);
      setIsModalOpen(false);
      setPhoneNumber('');

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
    <div className="container">
      <h2 className="heading">Select Your Package</h2>

      <button
        onClick={() => navigate('/service')}
        className="service-form-button"
        style={{ marginBottom: '20px', padding: '10px 20px' }}
      >
        Go to Service Form
      </button>

      <div className="card-container">
        {Object.keys(packagePrices).map((pkg) => (
          <div key={pkg} className={`card ${pkg.toLowerCase()}-card`} onClick={() => handleCardClick(pkg)}>
            <h3>{pkg}</h3>
            <p>KSh {packagePrices[pkg].toLocaleString()}/month</p>
            <p>{pkg === 'Basic' ? '7' : pkg === 'Intermediate' ? '10' : pkg === 'Big' ? '12' : '20'} Mbps</p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Make Payment for {selectedPackage}</h3>
            <label htmlFor="phone">Enter Safaricom Number:</label>
            <input
              type="tel"
              id="phone"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                setError(null);
              }}
              placeholder="e.g. 0712345678"
              disabled={isProcessing}
              maxLength="10"
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
            
            <div className="modal-buttons">
              <button 
                onClick={handlePayment}
                disabled={isProcessing}
                className={isProcessing ? 'processing' : ''}
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
                }}
                disabled={isProcessing}
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