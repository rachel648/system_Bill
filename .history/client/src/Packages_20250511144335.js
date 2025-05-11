// Packages.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const packages = [
  { name: 'Basic', price: 1500, speed: '7Mbps' },
  { name: 'Intermediate', price: 2000, speed: '10Mbps' },
  { name: 'Big', price: 3000, speed: '12Mbps' },
  { name: 'Mega', price: 6000, speed: '20Mbps' }
];

const cardStyle = {
  border: '1px solid #ccc',
  borderRadius: '10px',
  padding: '20px',
  margin: '10px',
  width: '200px',
  textAlign: 'center',
  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
  backgroundColor: '#f9f9f9'
};

const containerStyle = {
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: '20px',
  marginTop: '30px'
};

const Packages = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2>Choose a WiFi Package</h2>
      <div style={containerStyle}>
        {packages.map((pkg, index) => (
          <div key={index} style={cardStyle}>
            <h3>{pkg.name}</h3>
            <p><strong>{pkg.price}/month</strong></p>
            <p>{pkg.speed}</p>
            <button onClick={() => navigate('/')}>Select</button>
          </div>
        ))}
      </div>
      <br />
      <button onClick={() => navigate('/')}>Back to Form</button>
    </div>
  );
};

export default Packages;
