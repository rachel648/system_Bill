import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ServiceForm = () => {
  const [formData, setFormData] = useState({
    phone: '',
    packageType: 'basic',
    amount: 10,
  });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseInt(value) || 0 : value,
    }));
  };

  const handleRegister = async () => {
    if (!formData.phone.trim()) {
      setStatus({ message: 'Phone number is required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/users/register', {
        phone: formData.phone,
        package: formData.packageType,
      });

      setStatus({
        message: `Registration successful!`,
        type: 'success',
      });

      navigate('/packages');  // Navigate to Packages.js
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || 'Registration failed',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!formData.phone.trim()) {
      setStatus({ message: 'Phone number is required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`/api/users/status/${formData.phone}`);
      if (res.data && res.data.active !== undefined) {
        setStatus({
          message: `Welcome back! Status: ${res.data.active ? 'Active' : 'Inactive'}, Ends: ${new Date(res.data.endTime).toLocaleString()}`,
          type: 'success',
        });

        navigate('/packages');  // Navigate to Packages.js after sign-in
      } else {
        setStatus({ message: 'User not found', type: 'error' });
      }
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || 'Sign-in failed',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Internet Service</h2>

      <div style={styles.inputGroup}>
        <input
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          style={styles.input}
        />
      </div>

      <div style={styles.buttonGroup}>
        <button onClick={handleRegister} style={styles.button} disabled={loading}>
          {loading ? 'Processing...' : 'Register'}
        </button>
        <button onClick={handleSignIn} style={{ ...styles.button, backgroundColor: '#2ecc71' }} disabled={loading}>
          {loading ? 'Processing...' : 'Sign In'}
        </button>
      </div>

      {status.message && (
        <div style={{ ...styles.status, ...getStatusStyle() }}>
          {status.message}
        </div>
      )}
    </div>
  );
};

const styles = {
  // Add styles here...
};

export default ServiceForm;
