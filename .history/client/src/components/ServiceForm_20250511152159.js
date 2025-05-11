// components/ServiceForm.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ServiceForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    serviceType: 'wifi',
    packageType: 'basic',
    duration: 1,
    amount: 10
  });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'amount' ? parseInt(value) || 0 : value
    }));
  };

  const handleServiceChange = (e) => {
    handleChange(e);
    if (e.target.value === 'wifi') {
      navigate('/packages');
    }
  };

  const handleRegister = async () => {
    if (!formData.username.trim()) {
      setStatus({ message: 'Username is required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/users/register', {
        username: formData.username,
        serviceType: formData.serviceType,
        package: formData.packageType,
        duration: formData.duration
      });

      setStatus({
        message: `Registration successful! Service active until ${new Date(res.data.data.endTime).toLocaleDateString()}`,
        type: 'success'
      });
      setUserInfo(res.data.data);
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || err.message || 'Registration failed',
        type: 'error'
      });
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!formData.username.trim()) {
      setStatus({ message: 'Username is required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`/api/users/status/${formData.username}`);
      if (res.data && res.data.serviceType) {
        setStatus({
          message: `Welcome back, ${formData.username}!`,
          type: 'success'
        });
        setUserInfo(res.data);
      } else {
        setStatus({ message: 'User not found or inactive', type: 'error' });
        setUserInfo(null);
      }
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || 'Sign-in failed',
        type: 'error'
      });
      setUserInfo(null);
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

  const renderServiceInfo = () => {
    if (!userInfo) return null;

    return (
      <div style={styles.infoBox}>
        <h3>{userInfo.serviceType === 'wifi' ? 'WiFi Service Info' : 'Hotspot Service Info'}</h3>
        <p><strong>Username:</strong> {userInfo.username}</p>
        <p><strong>Status:</strong> {userInfo.active ? 'Active' : 'Inactive'}</p>
        <p><strong>Package:</strong> {userInfo.package}</p>
        <p><strong>Duration:</strong> {userInfo.duration} day(s)</p>
        <p><strong>Start Time:</strong> {new Date(userInfo.startTime).toLocaleString()}</p>
        <p><strong>End Time:</strong> {new Date(userInfo.endTime).toLocaleString()}</p>
      </div>
    );
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

      {renderServiceInfo()}
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
  },
  infoBox: {
    marginTop: '20px',
    padding: '15px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    backgroundColor: '#f9f9f9'
  }
};

export default ServiceForm;
