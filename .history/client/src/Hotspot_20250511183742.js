import React, { useState } from 'react';
import './Hotspot.css';

const Hotspot = () => {
  const [hours, setHours] = useState(1);
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
          min="0"
          onChange={handleInputChange}
          placeholder="Number of hours"
        />
      </div>

      <div className="total-display">
        Total Amount: <span>KES {totalAmount}</span>
      </div>

      <button className="pay-btn">Proceed to Pay</button>
    </div>
  );
};

export default Hotspot;
