import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/service');
      return;
    }

    fetchPayments();
    fetchStats();
    const interval = setInterval(() => {
      fetchPayments();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [navigate]);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('http://localhost:5000/api/admin/payments', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setPayments(response.data.payments);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('isAdmin');
        navigate('/service');
      }
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('http://localhost:5000/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('isAdmin');
    navigate('/service');
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (payment) => {
    let badgeClass = '';
    let text = payment.status;

    if (payment.status === 'completed' && payment.isCurrentlyActive) {
      badgeClass = 'status-active';
      text = 'Active';
    } else if (payment.status === 'completed' && !payment.isCurrentlyActive) {
      badgeClass = 'status-expired';
      text = 'Expired';
    } else if (payment.status === 'pending') {
      badgeClass = 'status-pending';
    } else if (payment.status === 'failed') {
      badgeClass = 'status-failed';
    } else if (payment.status === 'cancelled') {
      badgeClass = 'status-cancelled';
      text = 'Cancelled';
    }

    return <span className={`status-badge ${badgeClass}`}>{text}</span>;
  };

  const getRemainingTime = (payment) => {
    if (!payment.endTime || !payment.isCurrentlyActive) return 'N/A';
    
    const end = new Date(payment.endTime);
    const now = new Date();
    const diffMinutes = Math.max(0, Math.round((end - now) / (1000 * 60)));
    
    if (diffMinutes >= 60) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
    return `${diffMinutes} min`;
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === 'active' && !payment.isCurrentlyActive) return false;
    if (filter === 'pending' && payment.status !== 'pending') return false;
    if (filter === 'completed' && payment.status !== 'completed') return false;
    if (filter === 'expired' && 
        (payment.status !== 'completed' || payment.isCurrentlyActive)) return false;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        payment.phoneNumber.toLowerCase().includes(term) ||
        payment.package.toLowerCase().includes(term) ||
        (payment.mpesaCode && payment.mpesaCode.toLowerCase().includes(term))
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="dashboard-subtitle">Hotspot Package Management</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalPayments}</div>
            <div className="stat-label">Total Payments</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">KSh {stats.totalRevenue.toLocaleString()}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.activePayments}</div>
            <div className="stat-label">Active Now</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.todaysPayments}</div>
            <div className="stat-label">Today's Payments</div>
          </div>
        </div>
      )}

      <div className="controls">
        <div className="filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button 
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`filter-btn ${filter === 'expired' ? 'active' : ''}`}
            onClick={() => setFilter('expired')}
          >
            Expired
          </button>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search phone number or M-Pesa code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button 
            onClick={() => fetchPayments()} 
            className="refresh-button"
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="payments-table-container">
        <table className="payments-table">
          <thead>
            <tr>
              <th>Phone Number</th>
              <th>Package</th>
              <th>Amount</th>
              <th>M-Pesa Code</th>
              <th>Status</th>
              <th>Payment Time</th>
              <th>Starts</th>
              <th>Ends</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">
                  No payments found
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr key={payment._id}>
                  <td className="phone-number">{payment.phoneNumber}</td>
                  <td>
                    <span className="package-tag">{payment.package}</span>
                  </td>
                  <td className="amount">KSh {payment.amount.toLocaleString()}</td>
                  <td className="mpesa-code">
                    {payment.mpesaCode || 'N/A'}
                  </td>
                  <td>{getStatusBadge(payment)}</td>
                  <td>{formatTime(payment.transactionDate)}</td>
                  <td>{formatTime(payment.startTime)}</td>
                  <td>{formatTime(payment.endTime)}</td>
                  <td className="remaining-time">
                    {getRemainingTime(payment)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="dashboard-footer">
        <p>Last updated: {new Date().toLocaleTimeString()}</p>
        <p>Total records: {payments.length} | Showing: {filteredPayments.length}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;