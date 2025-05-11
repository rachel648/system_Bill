import React, { useState } from 'react';
import axios from 'axios';

const ServiceForm = () => {
  const [username, setUsername] = useState('');
  const [serviceType, setServiceType] = useState('wifi');
  const [duration, setDuration] = useState(1);
  const [status, setStatus] = useState('');

  const handleRegister = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/users/register', {
        username,
        serviceType,
        duration
      });
      setStatus(res.data.message);
    } catch (err) {
      setStatus('Registration failed');
    }
  };

  const handleCheck = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/users/status/${username}`);
      setStatus(`Active: ${res.data.active}, Ends: ${new Date(res.data.endTime).toLocaleString()}`);
    } catch (err) {
      setStatus('User not found');
    }
  };

  const handleRenew = async () => {
    try {
      const res = await axios.post(`http://localhost:5000/api/users/renew`, {
        username,
        duration
      });
      setStatus(res.data.message);
    } catch (err) {
      setStatus('Renewal failed');
    }
  };

  return (
    <div>
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <select value={serviceType} onChange={e => setServiceType(e.target.value)}>
        <option value="wifi">WiFi</option>
        <option value="hotspot">Hotspot</option>
      </select>
      <input
        type="number"
        placeholder="Duration (hours for hotspot)"
        value={duration}
        onChange={e => setDuration(e.target.value)}
      />
      <button onClick={handleRegister}>Register & Pay</button>
      <button onClick={handleCheck}>Check Status</button>
      <button onClick={handleRenew}>Renew</button>
      <p>{status}</p>
    </div>
  );
};

export default ServiceForm;
