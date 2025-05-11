import React, { useState } from 'react';
import './Packages.css'; // Create this CSS file

const Packages = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);  // To track modal visibility
  const [selectedPackage, setSelectedPackage] = useState(null);  // To track selected package
  const [phoneNumber, setPhoneNumber] = useState('');  // To store phone number

  const handleCardClick = (pkg) => {
    setSelectedPackage(pkg);  // Set the selected package
    setIsModalOpen(true);  // Open the modal
  };

  const handlePayment = () => {
    // Simulate sending payment prompt for the number
    alert(`Payment request for ${selectedPackage} sent to phone number: ${phoneNumber}`);
    setIsModalOpen(false);  // Close the modal after payment
  };

  return (
    <div className="container">
      <h2 className="heading">Select Your Package</h2>

      <div className="card-container">
        <div className="card basic-card" onClick={() => handleCardClick('Basic')}>
          <h3>Basic</h3>
          <p>$1500/month</p>
          <p>7 Mbps</p>
        </div>
        <div className="card intermediate-card" onClick={() => handleCardClick('Intermediate')}>
          <h3>Intermediate</h3>
          <p>$2000/month</p>
          <p>10 Mbps</p>
        </div>
        <div className="card big-card" onClick={() => handleCardClick('Big')}>
          <h3>Big</h3>
          <p>$3000/month</p>
          <p>12 Mbps</p>
        </div>
        <div className="card mega-card" onClick={() => handleCardClick('Mega')}>
          <h3>Mega</h3>
          <p>$6000/month</p>
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
