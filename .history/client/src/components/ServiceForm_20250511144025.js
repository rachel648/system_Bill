// ServiceForm.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ServiceForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    serviceType: 'wifi',
    packageType: 'basic',
    duration: 1,
    amount: 10
  });

  const [status, setStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Redirect to packages page if wifi is selected
    if (name === 'serviceType' && value === 'wifi') {
      navigate('/packages');
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'amount' ? parseInt(value) || 0 : value
    }));
  };

  // ...rest of your register, check, and pay logic remains the same

  return (
    <div style={{ maxWidth: '500px', margin: 'auto', padding: '20px' }}>
      <h2>Internet Service</h2>
      <input
        name="username"
        placeholder="Username"
        value={formData.username}
        onChange={handleChange}
      />
      <br /><br />
      <input
        name="phone"
        placeholder="Phone Number"
        value={formData.phone}
        onChange={handleChange}
      />
      <br /><br />
      <select name="serviceType" value={formData.serviceType} onChange={handleChange}>
        <option value="wifi">WiFi</option>
        <option value="hotspot">Hotspot</option>
      </select>
      <br /><br />
      {/* ... the rest of your form */}
    </div>
  );
};

export default ServiceForm;
