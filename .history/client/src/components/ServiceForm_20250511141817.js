import React, { useState } from 'react';
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
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['duration', 'amount'].includes(name) ? parseInt(value) || 0 : value
    }));
  };

  const validateUsername = () => {
    if (!formData.username.trim()) {
      setStatus({ message: 'Username is required', type: 'error' });
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateUsername()) return;
    setLoading(true);
    try {
      const res = await axios.post('/api/users/register', {
        username: formData.username,
        serviceType: formData.serviceType,
        package: formData.packageType,
        duration: formData.duration
      });
      setStatus({
        message: `✅ Registered! Active until ${new Date(res.data.data.endTime).toLocaleDateString()}`,
        type: 'success'
      });
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || 'Registration failed ❌',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    if (!validateUsername()) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/users/status/${formData.username}`);
      setStatus({
        message: `ℹ️ Status: ${res.data.active ? 'Active' : 'Inactive'} | Ends: ${new Date(res.data.endTime).toLocaleString()}`,
        type: 'info'
      });
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || 'User not found ❗',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!validateUsername()) return;
    setLoading(true);
    try {
      const res = await axios.post('/api/users/pay', {
        username: formData.username,
        amount: formData.amount,
        duration: formData.duration
      });
      setStatus({
        message: `💳 Payment successful! ${res.data.message}`,
        type: 'success'
      });
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || 'Payment failed ❌',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = () => {
    switch (status.type) {
      case 'success': return { backgroundColor: '#e6ffed', color: '#2e7d32', border: '1px solid #2e7d32' };
      case 'error': return { backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #c62828' };
      case 'info': return { backgroundColor: '#e3f2fd', color: '#1565c0', border: '1px solid #1565c0' };
      default: return {};
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>📶 Internet Service Portal</h2>

      <div style={styles.card}>
        {[
          { label: 'Username', name: 'username', type: 'text' },
          { label: 'Service Type', name: 'serviceType', type: 'select', options: ['wifi', 'hotspot'] },
          { label: 'Package Type', name: 'packageType', type: 'select', options: ['basic', 'standard', 'premium'] },
          { label: 'Duration (days)', name: 'duration', type: 'number' },
          { label: 'Amount ($)', name: 'amount', type: 'number' }
        ].map(({ label, name, type, options }) => (
          <div key={name} style={styles.inputGroup}>
            <label style={styles.label}>{label}</label>
            {type === 'select' ? (
              <select name={name} value={formData[name]} onChange={handleChange} style={styles.select}>
                {options.map(option => (
                  <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                style={styles.input}
                min={type === 'number' ? 1 : undefined}
              />
            )}
          </div>
        ))}

        <div style={styles.buttonGroup}>
          <button onClick={handleRegister} style={styles.button} disabled={loading}>
            {loading ? 'Processing...' : '📝 Register'}
          </button>
          <button onClick={handleCheck} style={styles.button} disabled={loading}>
            {loading ? 'Checking...' : '🔍 Check Status'}
          </button>
          <button onClick={handlePay} style={styles.button} disabled={loading}>
            {loading ? 'Processing...' : '💰 Make Payment'}
          </button>
        </div>

        {status.message && (
          <div style={{ ...styles.statusBox, ...getStatusStyle() }}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Segoe UI, sans-serif',
    background: '#f0f4f8',
    minHeight: '100vh',
    padding: '30px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  heading: {
    position: 'absolute',
    top: '20px',
    fontSize: '26px',
    fontWeight: '600',
    color: '#3498db',
    textAlign: 'center'
  },
  card: {
    background: '#ffffff',
    padding: '25px',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '500px'
  },
  inputGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '16px'
  },
  select: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '16px'
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px'
  },
  button: {
    flex: 1,
    padding: '12px 15px',
    margin: '0 5px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#3498db',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease'
  },
  statusBox: {
    marginTop: '20px',
    padding: '15px',
    borderRadius: '6px',
    fontWeight: '500',
    fontSize: '15px'
  }
};

export default ServiceForm;
