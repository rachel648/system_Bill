// Packages.js
import React from 'react';
import './Packages.css'; // Create this CSS file

const Packages = () => {
  return (
    <div className="container">
      <h2 className="heading">Select Your Package</h2>

      <div className="card-container">
        <div className="card basic-card">
          <h3>Basic</h3>
          <p>$1500/month</p>
          <p>7 Mbps</p>
        </div>
        <div className="card intermediate-card">
          <h3>Intermediate</h3>
          <p>$2000/month</p>
          <p>10 Mbps</p>
        </div>
        <div className="card big-card">
          <h3>Big</h3>
          <p>$3000/month</p>
          <p>12 Mbps</p>
        </div>
        <div className="card mega-card">
          <h3>Mega</h3>
          <p>$6000/month</p>
          <p>20 Mbps</p>
        </div>
      </div>
    </div>
  );
};

export default Packages;