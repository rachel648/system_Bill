import React, { useState } from 'react';
import './Hotspot.css';

const Hotspot = () => {
  const [hours, setHours] = useState(1);
  const [showModal, setShowModal] = useState(false);
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

  const handlePayClick = () => {
    if (hours > 0) {
      setShowModal(true);
    } else {
      alert("Please enter at least 1 hour.");
    }
  };

  const handleConfirmPayment = () => {
    setShowModal(false);
    alert(`Payment of KES ${totalAmount} for ${hours} hour(s) confirmed!`);
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
            <button onClick={handleConfirmPayment}>Confirm</button>
            <button onClick={() => setShowModal(false)} style={{ backgroundColor: '#ccc', color: '#333' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hotspot;
