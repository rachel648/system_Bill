// components/ServiceForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ServiceForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    serviceType: 'wifi',
    phoneNumber: '',
    duration: 1,
    amount: 10
  });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if user is already registered when component loads
  useEffect(() => {
    const checkUserStatus = async () => {
      if (formData.username.trim()) {
        try {
          const res = await axios.get(`/api/users/status/${formData.username.trim().toLowerCase()}`);
          const user = res.data;
          if (user && user.phoneNumber) {
            setStatus({ message: `Welcome back, ${user.username}.`, type: 'success' });
          }
        } catch (err) {
          setStatus({ message: 'User not found. Please register first.', type: 'error' });
        }
      }
    };
    checkUserStatus();
  }, [formData.username]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration' || name === 'amount' ? parseInt(value) || 0 : value.trim()
    }));
  };

  const handleRegister = async () => {
    // Validate required fields
    if (!formData.username.trim()) {
      setStatus({ message: 'Username is required', type: 'error' });
      return;
    }

    if (!formData.phoneNumber.trim()) {
      setStatus({ message: 'Phone number is required', type: 'error' });
      return;
    }

    const normalizedUsername = formData.username.trim().toLowerCase();

    // Check if user is already registered before registering again
    try {
      const res = await axios.get(`/api/users/status/${normalizedUsername}`);
      const existingUser = res.data;
      if (existingUser) {
        // User already exists, sign them in instead of registering
        setStatus({ message: 'User already registered. Signing in...', type: 'success' });
        setTimeout(() => {
          navigate(`/${existingUser.serviceType}`);
        }, 1000);
        return;
      }
    } catch (err) {
      // Proceed with registration if user doesn't exist
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/users/register', {
        username: normalizedUsername,
        serviceType: formData.serviceType,
        phoneNumber: formData.phoneNumber,
        duration: formData.duration
      });

      if (formData.serviceType === 'wifi') {
        // Navigate to packages page if WiFi is chosen
        navigate('/packages');
      } else {
        setStatus({
          message: `Registration successful! Service active until ${new Date(res.data.data.endTime).toLocaleDateString()}`,
          type: 'success'
        });
      }
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
    if (!formData.username.trim()) {
      setStatus({ message: 'Username is required.', type: 'error' });
      return;
    }

    const normalizedUsername = formData.username.trim().toLowerCase();

    setLoading(true);
    try {
      const res = await axios.get(`/api/users/status/${normalizedUsername}`);
      const user = res.data;

      if (user && user.serviceType) {
        setStatus({ message: `Signed in as ${user.username}. Redirecting...`, type: 'success' });
        setTimeout(() => {
          navigate(`/${user.serviceType}`);
        }, 1000);
      } else {
        setStatus({ message: 'User not found.', type: 'error' });
      }
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || 'Sign in failed.',
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

  const handleServiceChange = (e) => {
    handleChange(e);
    if (e.target.value === 'wifi') {
      navigate('/packages');
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
        <label style={styles.label}>Service Type: </label>
        <select
          name="serviceType"
          value={formData.serviceType}
          onChange={handleServiceChange}
          style={styles.select}
        >
          <option value="wifi">WiFi</option>
          <option value="hotspot">Hotspot</option>
        </select>
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Phone Number: </label>
        <input
          name="phoneNumber"
          placeholder="Enter phone number"
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
          style={styles.button}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Sign In'}
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
  select: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '16px',
    width: '100%'
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
