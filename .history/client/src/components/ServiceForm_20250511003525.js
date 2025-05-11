import React, { useState } from 'react';
import axios from 'axios';

const ServiceForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    serviceType: 'wifi',
    package: 'basic',
    duration: 30
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await axios.post('http://localhost:5000/api/users/register', formData);
      
      setMessage({
        type: 'success',
        text: `Registration successful! Service active until ${new Date(response.data.data.endTime).toLocaleDateString()}`
      });

      // Reset form
      setFormData({
        username: '',
        serviceType: 'wifi',
        package: 'basic',
        duration: 30
      });

    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Registration failed';
      setMessage({
        type: 'error',
        text: errorMsg
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Register New Service</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Service Type:</label>
          <select
            name="serviceType"
            value={formData.serviceType}
            onChange={handleChange}
          >
            <option value="wifi">WiFi</option>
            <option value="hotspot">Hotspot</option>
          </select>
        </div>

        <div className="form-group">
          <label>Package:</label>
          <select
            name="package"
            value={formData.package}
            onChange={handleChange}
          >
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        <div className="form-group">
          <label>Duration (days):</label>
          <input
            type="number"
            name="duration"
            min="1"
            value={formData.duration}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Register'}
        </button>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
};

export default ServiceForm;