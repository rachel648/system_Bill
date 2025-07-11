import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ServiceForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    phoneNumber: '',
    packageType: 'basic',
    duration: 1,
    amount: 10
  });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'amount' ? parseInt(value) || 0 : value
    }));
  };

  const handleRegister = async () => {
    if (!formData.username.trim()) {
      setStatus({ message: 'Username is required', type: 'error' });
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setStatus({ message: 'Phone number is required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/users/register', {
        username: formData.username,
        phoneNumber: formData.phoneNumber,
        package: formData.packageType,
        duration: formData.duration
      });

      setStatus({
        message: `Registration successful! Service active until ${new Date(res.data.data.endTime).toLocaleDateString()}`,
        type: 'success'
      });
      navigate('/packages');
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || err.message || 'Registration failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (formData.username === 'admin' && formData.phoneNumber === 'admin') {
      // Admin login
      navigate('/admin');
      return;
    }

    if (!formData.username.trim()) {
      setStatus({ message: 'Username is required', type: 'error' });
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setStatus({ message: 'Phone number is required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`/api/users/status/${formData.username}`);
      if (res.data && res.data.active !== undefined) {
        setStatus({
          message: `Welcome back! Status: ${res.data.active ? 'Active' : 'Inactive'}, Ends: ${new Date(res.data.endTime).toLocaleString()}`,
          type: 'success'
        });
        navigate('/packages');
      } else {
        setStatus({ message: 'User not found', type: 'error' });
      }
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || 'Sign-in failed',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = () => {
    switch (status.type) {
      case 'success': return { backgroundColor: '#e8f5e9', color: '#2e7d32' };
      case 'error': return { backgroundColor: '#ffebee', color: '#c62828' };
      case 'info': return { backgroundColor: '#e3f2fd', color: '#1565c0' };
      default: return { backgroundColor: '#f5f5f5', color: '#424242' };
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Internet Service</h2>

      <div style={styles.inputGroup}>
        <input
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          style={styles.input}
        />
      </div>

      <div style={styles.inputGroup}>
        <input
          name="phoneNumber"
          placeholder="Phone Number"
          value={formData.phoneNumber}
          onChange={handleChange}
          style={styles.input}
        />
      </div>

      <div style={styles.buttonGroup}>
        <button
          onClick={handleRegister}
          style={styles.button}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Register'}
        </button>
        <button
          onClick={handleSignIn}
          style={{ ...styles.button, backgroundColor: '#2ecc71' }}
          disabled={loading}
        >
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
  container: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    backgroundColor: '#fff'
  },
  heading: {
    textAlign: 'center',
    color: '#3498db',
    marginBottom: '20px'
  },
  inputGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: '500',
    color: '#2c3e50'
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '16px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px'
  },
  button: {
    padding: '10px 15px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#3498db',
    color: 'white',
    cursor: 'pointer',
    flex: 1,
    fontSize: '16px'
  },
  status: {
    padding: '12px',
    borderRadius: '4px',
    fontSize: '16px',
    textAlign: 'center'
  }
};

export default ServiceForm;
