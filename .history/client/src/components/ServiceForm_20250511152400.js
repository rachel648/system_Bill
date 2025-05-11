import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ServiceForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    serviceType: 'wifi',
    packageType: 'basic',
    duration: 1
  });
  const [status, setStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration' ? parseInt(value) || 0 : value,
    }));
  };

  const handleRegister = async () => {
    if (!formData.username.trim()) {
      setStatus({ message: 'Username is required.', type: 'error' });
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

      const service = res.data.data.serviceType;
      setStatus({
        message: `Registration successful. Redirecting to ${service}...`,
        type: 'success'
      });

      setTimeout(() => {
        navigate(`/${service}`);
      }, 1500);

    } catch (err) {
      setStatus({
        message: err.response?.data?.message || 'Registration failed.',
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

    setLoading(true);
    try {
      const res = await axios.get(`/api/users/status/${formData.username}`);
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
      default: return {};
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Internet Service Portal</h2>

      <input
        name="username"
        placeholder="Enter Username"
        value={formData.username}
        onChange={handleChange}
        style={styles.input}
      />

      <select
        name="serviceType"
        value={formData.serviceType}
        onChange={handleChange}
        style={styles.select}
      >
        <option value="wifi">WiFi</option>
        <option value="hotspot">Hotspot</option>
      </select>

      <select
        name="packageType"
        value={formData.packageType}
        onChange={handleChange}
        style={styles.select}
      >
        <option value="basic">Basic</option>
        <option value="standard">Standard</option>
        <option value="premium">Premium</option>
      </select>

      <input
        name="duration"
        type="number"
        min="1"
        value={formData.duration}
        onChange={handleChange}
        placeholder="Duration (days)"
        style={styles.input}
      />

      <div style={styles.buttonGroup}>
        <button onClick={handleRegister} style={styles.button} disabled={loading}>
          {loading ? 'Please wait...' : 'Register'}
        </button>
        <button onClick={handleSignIn} style={{ ...styles.button, backgroundColor: '#27ae60' }} disabled={loading}>
          {loading ? 'Please wait...' : 'Sign In'}
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
    maxWidth: 480,
    margin: '30px auto',
    padding: 20,
    borderRadius: 8,
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  heading: {
    textAlign: 'center',
    color: '#2980b9',
    marginBottom: 20
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    borderRadius: 4,
    border: '1px solid #ccc'
  },
  select: {
    width: '100%',
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    borderRadius: 4,
    border: '1px solid #ccc'
  },
  buttonGroup: {
    display: 'flex',
    gap: 10
  },
  button: {
    flex: 1,
    padding: 10,
    backgroundColor: '#3498db',
    color: '#fff',
    fontSize: 16,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  },
  status: {
    marginTop: 20,
    padding: 12,
    borderRadius: 4,
    fontWeight: 500,
    textAlign: 'center'
  }
};

export default ServiceForm;
