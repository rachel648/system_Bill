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
    // Check for admin login
    if (formData.username === 'admin' && formData.phoneNumber === 'admin') {
      setLoading(true);
      try {
        // Call the admin login endpoint
        const response = await axios.post('http://localhost:5000/api/admin/login', {
          username: 'admin',
          password: 'admin'
        });

        if (response.data.success) {
          // Save token to localStorage
          localStorage.setItem('adminToken', response.data.token);
          localStorage.setItem('adminUser', JSON.stringify(response.data.admin));
          
          setStatus({
            message: 'Admin login successful! Redirecting to dashboard...',
            type: 'success'
          });
          
          // Navigate to admin dashboard
          setTimeout(() => {
            navigate('/admin');
          }, 1000);
        } else {
          setStatus({
            message: response.data.message || 'Admin login failed',
            type: 'error'
          });
        }
      } catch (err) {
        console.error('Admin login error:', err);
        setStatus({
          message: 'Admin login failed. Please check if backend server is running.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Regular user sign-in
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
      <h2 style={styles.heading}>Internet Service Portal</h2>
      
      <div style={styles.adminNote}>
        <strong>Admin Access:</strong> Use username: <code>admin</code> and password: <code>admin</code>
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Username</label>
        <input
          name="username"
          placeholder="Enter username (use 'admin' for admin login)"
          value={formData.username}
          onChange={handleChange}
          style={styles.input}
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Phone Number / Admin Password</label>
        <input
          name="phoneNumber"
          placeholder="For users: phone number, For admin: 'admin'"
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
          {loading ? 'Processing...' : 'Register User'}
        </button>
        <button
          onClick={handleSignIn}
          style={{ ...styles.button, backgroundColor: '#2ecc71' }}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Sign In / Admin Login'}
        </button>
      </div>

      {status.message && (
        <div style={{ ...styles.status, ...getStatusStyle() }}>
          {status.message}
        </div>
      )}

      <div style={styles.infoSection}>
        <h3 style={styles.infoTitle}>How to use:</h3>
        <ul style={styles.infoList}>
          <li><strong>Regular Users:</strong> Enter username and phone number, click "Register" or "Sign In"</li>
          <li><strong>Admin:</strong> Enter username: <code>admin</code> and password: <code>admin</code>, click "Sign In"</li>
          <li>Admin dashboard shows all package payments with real-time status</li>
          <li>Package payments automatically track activation and expiration</li>
          <li>M-Pesa payments are recorded and monitored in real-time</li>
        </ul>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '500px',
    margin: '40px auto',
    padding: '30px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    backgroundColor: '#fff'
  },
  heading: {
    textAlign: 'center',
    color: '#3498db',
    marginBottom: '20px',
    fontSize: '28px',
    fontWeight: 'bold'
  },
  adminNote: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#856404',
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '16px',
    transition: 'border-color 0.3s',
    boxSizing: 'border-box'
  },
  buttonGroup: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px'
  },
  button: {
    padding: '14px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#3498db',
    color: 'white',
    cursor: 'pointer',
    flex: 1,
    fontSize: '16px',
    fontWeight: '600',
    transition: 'background-color 0.3s, transform 0.2s'
  },
  status: {
    padding: '15px',
    borderRadius: '6px',
    fontSize: '16px',
    textAlign: 'center',
    marginBottom: '20px',
    fontWeight: '500'
  },
  infoSection: {
    marginTop: '25px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e9ecef'
  },
  infoTitle: {
    color: '#2c3e50',
    marginBottom: '15px',
    fontSize: '18px',
    fontWeight: '600'
  },
  infoList: {
    listStyleType: 'none',
    padding: 0,
    margin: 0
  }
};

// Add hover effects
styles.button = {
  ...styles.button,
  ':hover:not(:disabled)': {
    backgroundColor: '#2980b9',
    transform: 'translateY(-2px)'
  },
  ':disabled': {
    backgroundColor: '#bdc3c7',
    cursor: 'not-allowed'
  }
};

styles.input = {
  ...styles.input,
  ':focus': {
    outline: 'none',
    borderColor: '#3498db',
    boxShadow: '0 0 0 2px rgba(52, 152, 219, 0.2)'
  }
};

styles.infoList = {
  ...styles.infoList,
  li: {
    marginBottom: '10px',
    paddingLeft: '20px',
    position: 'relative',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#495057'
  },
  'li:before': {
    content: '"•"',
    color: '#3498db',
    position: 'absolute',
    left: 0,
    fontWeight: 'bold'
  }
};

export default ServiceForm;