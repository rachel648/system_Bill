import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ServiceForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: ''
  });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateFields = () => {
    if (!formData.name.trim()) {
      setStatus({ message: 'Name is required', type: 'error' });
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      setStatus({ message: 'Phone number is required', type: 'error' });
      return false;
    }
    if (!/^\d{10,15}$/.test(formData.phoneNumber)) {
      setStatus({ message: 'Please enter a valid phone number (10-15 digits)', type: 'error' });
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateFields()) return;
    
    setLoading(true);
    try {
      const res = await axios.post('/api/users/register', formData);
      setStatus({
        message: 'Registration successful!',
        type: 'success'
      });
      navigate('/packages');
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || 'Registration failed. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!validateFields()) return;
    
    setLoading(true);
    try {
      const res = await axios.get(`/api/users/status/${formData.phoneNumber}`);
      if (res.data) {
        setStatus({
          message: `Welcome back, ${formData.name}!`,
          type: 'success'
        });
        navigate('/packages');
      } else {
        setStatus({ 
          message: 'User not found. Please register first.', 
          type: 'error' 
        });
      }
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || 'Sign-in failed. Please try again.',
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
      default: return { backgroundColor: '#f5f5f5', color: '#424242' };
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Register or Sign In</h2>

      <div style={styles.inputGroup}>
        <input
          name="name"
          placeholder="Your Name"
          value={formData.name}
          onChange={handleChange}
          style={styles.input}
          disabled={loading}
        />
      </div>

      <div style={styles.inputGroup}>
        <input
          name="phoneNumber"
          placeholder="Phone Number (10-15 digits)"
          value={formData.phoneNumber}
          onChange={handleChange}
          style={styles.input}
          type="tel"
          disabled={loading}
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
    margin: '2rem auto',
    padding: '2rem',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    backgroundColor: '#ffffff'
  },
  heading: {
    textAlign: 'center',
    color: '#3498db',
    marginBottom: '1.5rem',
    fontSize: '1.5rem'
  },
  inputGroup: {
    marginBottom: '1rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  button: {
    padding: '0.75rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#3498db',
    color: 'white',
    cursor: 'pointer',
    flex: 1,
    fontSize: '1rem',
    transition: 'background-color 0.2s',
    ':disabled': {
      backgroundColor: '#95a5a6',
      cursor: 'not-allowed'
    }
  },
  status: {
    padding: '0.75rem',
    borderRadius: '4px',
    fontSize: '1rem',
    textAlign: 'center',
    marginTop: '1rem'
  }
};

export default ServiceForm;