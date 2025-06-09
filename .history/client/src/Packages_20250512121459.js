import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Packages.css';

const packagePrices = {
  Basic: 1500,
  Intermediate: 2000,
  Big: 3000,
  Mega: 6000,
};

const Packages = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const navigate = useNavigate();

  const handleCardClick = (pkg) => {
    setSelectedPackage(pkg);
    setIsModalOpen(true);
  };

  const handlePayment = async () => {
    if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
      alert('Please enter a valid phone number.');
      return;
    }

    const amount = packagePrices[selectedPackage];

    const paymentData = {
      phone: phoneNumber,
      amount,
      package: selectedPackage,
    };

    try {
      const response = await fetch('http://localhost:5000/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.client_secret) {
          alert(`Payment request for ${selectedPackage} sent to ${phoneNumber}.`);

          const paymentResult = await confirmPayment(responseData.client_secret);

          if (paymentResult.success) {
            alert('✅ Payment Successful!');
          } else {
            alert('❌ Payment failed. Please try again.');
          }
        }
      } else {
        alert('❌ Failed to process the payment. Please try again.');
      }
    } catch (error) {
      console.error('Error making payment request:', error);
      alert('An error occurred. Please try again later.');
    }

    setPhoneNumber('');
    setIsModalOpen(false);
  };

  const confirmPayment = async (clientSecret) => {
    // Simulate successful payment confirmation
    return { success: true };
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
            <p>{packagePrices[pkg]}/month</p>
            <p>{pkg === 'Basic' ? '7' : pkg === 'Intermediate' ? '10' : pkg === 'Big' ? '12' : '20'} Mbps</p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Make Payment for {selectedPackage}</h3>
            <label htmlFor="phone">Enter Phone Number:</label>
            <input
              type="text"
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 0712345678"
            />
            <div className="modal-buttons">
              <button onClick={handlePayment}>Submit Payment</button>
              <button onClick={() => setIsModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Packages;
