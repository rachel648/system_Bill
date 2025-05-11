import React, { useState } from 'react';
import axios from 'axios';

const ServiceForm = () => {
  const [username, setUsername] = useState('');
  const [serviceType, setServiceType] = useState('wifi');
  const [packageType, setPackageType] = useState('basic');
  const [duration, setDuration] = useState(1);
  const [amount, setAmount] = useState(10);
  const [status, setStatus] = useState('');

  const handleRegister = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/users/register', {
        username,
        serviceType,
        package: packageType,
        duration
      });
      setStatus(`Registration successful! ${res.data.message}`);
    } catch (err) {
      setStatus(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleCheck = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/users/status/${username}`);
      setStatus(`Status: ${res.data.active ? 'Active' : 'Inactive'}, Ends: ${new Date(res.data.endTime).toLocaleString()}`);
    } catch (err) {
      setStatus(err.response?.data?.message || 'User not found');
    }
  };

  const handlePay = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/users/pay', {
        username,
        amount,
        duration
      });
      setStatus(`Payment successful! ${res.data.message}`);
    } catch (err) {
      setStatus(err.response?.data?.message || 'Payment failed');
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <h2>Internet Service</h2>
      <div style={{ marginBottom: '15px' }}>
        <input 
          placeholder="Username" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
          style={{ width: '100%', padding: '8px' }}
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label>Service Type: </label>
        <select 
          value={serviceType} 
          onChange={e => setServiceType(e.target.value)}
          style={{ padding: '8px' }}
        >
          <option value="wifi">WiFi</option>
          <option value="hotspot">Hotspot</option>
        </select>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label>Package: </label>
        <select 
          value={packageType} 
          onChange={e => setPackageType(e.target.value)}
          style={{ padding: '8px' }}
        >
          <option value="basic">Basic ($10/month)</option>
          <option value="standard">Standard ($20/month)</option>
          <option value="premium">Premium ($30/month)</option>
        </select>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label>Duration (days): </label>
        <input
          type="number"
          min="1"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          style={{ padding: '8px', width: '60px' }}
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label>Amount ($): </label>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{ padding: '8px', width: '60px' }}
        />
      </div>
      
      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
        <button onClick={handleRegister} style={{ padding: '8px 15px' }}>Register</button>
        <button onClick={handleCheck} style={{ padding: '8px 15px' }}>Check Status</button>
        <button onClick={handlePay} style={{ padding: '8px 15px' }}>Make Payment</button>
      </div>
      
      {status && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: status.includes('failed') ? '#ffebee' : '#e8f5e9',
          borderRadius: '4px'
        }}>
          {status}
        </div>
      )}
    </div>
  );
};

export default ServiceForm;