import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- for navigation
import './Packages.css';

const Packages = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const navigate = useNavigate(); // <-- Initialize navigate

  const handleCardClick = (pkg) => {
    setSelectedPackage(pkg);
    setIsModalOpen(true);
  };

  const handlePayment = async () => {
    const paymentData = {
      phone: phoneNumber,
      amount:
        selectedPackage === 'Basic'
          ? '$1500'
          : selectedPackage === 'Intermediate'
          ? '$2000'
          : selectedPackage === 'Big'
          ? '$3000'
          : '$6000',
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
          alert(
            `Payment request for ${selectedPackage} sent to phone number: ${phoneNumber}. Client Secret: ${responseData.client_secret}`
          );

          const paymentResult = await confirmPayment(responseData.client_secret);

          if (paymentResult.success) {
            alert('Payment Successful!');
          } else {
            alert('Payment failed. Please try again.');
          }
        }
      } else {
        alert('Failed to process the payment. Please try again.');
      }
    } catch (error) {
      console.error('Error making payment request:', error);
      alert('An error occurred. Please try again later.');
    }

    setIsModalOpen(false);
  };

  const confirmPayment = async (clientSecret) => {
    return { success: true };
  };

  return (
    <div className="container">
      <h2 className="heading">Select Your Package</h2>
      
      {/* New button to navigate to Service Form */}
      <button
        onClick={() => navigate('/service')}
        className="service-form-button"
        style={{ marginBottom: '20px', padding: '10px 20px' }}
      >
        Go to Service Form
      </button>

      <div className="card-container">
        <div className="card basic-card" onClick={() => handleCardClick('Basic')}>
          <h3>Basic</h3>
          <p>1500/month</p>
          <p>7 Mbps</p>
        </div>
        <div className="card intermediate-card" onClick={() => handleCardClick('Intermediate')}>
          <h3>Intermediate</h3>
          <p>2000/month</p>
          <p>10 Mbps</p>
        </div>
        <div className="card big-card" onClick={() => handleCardClick('Big')}>
          <h3>Big</h3>
          <p>3000/month</p>
          <p>12 Mbps</p>
        </div>
        <div className="card mega-card" onClick={() => handleCardClick('Mega')}>
          <h3>Mega</h3>
          <p>6000/month</p>
          <p>20 Mbps</p>
        </div>
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
              placeholder="Phone number"
            />
            <button onClick={handlePayment}>Submit Payment</button>
            <button onClick={() => setIsModalOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Packages;
