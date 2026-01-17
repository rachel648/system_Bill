import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line
} from 'recharts';

const AdminDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showActions, setShowActions] = useState(null);
  const [manualHours, setManualHours] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newMpesaCode, setNewMpesaCode] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [showGraphs, setShowGraphs] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/service');
      return;
    }

    fetchPayments();
    fetchStats();
    fetchChartData();
    const interval = setInterval(() => {
      fetchPayments();
      fetchStats();
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

  const fetchChartData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('http://localhost:5000/api/admin/chart-data', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setChartData(response.data.chartData);
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
  };

  const handleActivate = async (paymentId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(
        `http://localhost:5000/api/admin/payments/${paymentId}/activate`,
        { durationHours: manualHours || null },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccessMessage(`✅ Payment activated successfully!`);
        fetchPayments();
        fetchStats();
        fetchChartData();
        setShowActions(null);
        setManualHours('');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate payment');
    }
  };

  const handleDeactivate = async (paymentId) => {
    if (!window.confirm('Are you sure you want to deactivate this payment?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(
        `http://localhost:5000/api/admin/payments/${paymentId}/deactivate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccessMessage('✅ Payment deactivated successfully!');
        fetchPayments();
        fetchStats();
        fetchChartData();
        setShowActions(null);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate payment');
    }
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.delete(
        `http://localhost:5000/api/admin/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccessMessage('🗑️ Payment deleted successfully!');
        fetchPayments();
        fetchStats();
        fetchChartData();
        setShowActions(null);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete payment');
    }
  };

  const handleUpdate = async (paymentId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const updateData = {};
      
      if (newStatus) updateData.status = newStatus;
      if (newMpesaCode) updateData.mpesaCode = newMpesaCode;
      if (newAmount) updateData.amount = parseFloat(newAmount);

      const response = await axios.put(
        `http://localhost:5000/api/admin/payments/${paymentId}/status`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSuccessMessage('✅ Payment updated successfully!');
        fetchPayments();
        fetchStats();
        fetchChartData();
        setShowActions(null);
        setNewStatus('');
        setNewMpesaCode('');
        setNewAmount('');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update payment');
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

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  const PACKAGE_COLORS = {
    'Basic': '#6a11cb',
    'Intermediate': '#ff9966',
    'Big': '#56ab2f',
    'Mega': '#00c6ff',
    'Super': '#ff416c',
    'DayOffer': '#f7971e'
  };

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
        <div className="header-actions">
          <button 
            onClick={() => setShowGraphs(!showGraphs)} 
            className="toggle-graphs-btn"
          >
            {showGraphs ? '📊 Hide Graphs' : '📊 Show Graphs'}
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
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

      {showGraphs && chartData && (
        <div className="charts-container">
          <div className="chart-row">
            <div className="chart-card">
              <h3>Daily Payments (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.dailyPayments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3498db" name="Payments" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="chart-card">
              <h3>Package Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData.packageDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="_id"
                  >
                    {chartData.packageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PACKAGE_COLORS[entry._id] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="chart-row">
            <div className="chart-card">
              <h3>Today's Payment Activity</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#2ecc71" activeDot={{ r: 8 }} name="Payments per Hour" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="chart-card">
              <h3>Status Overview</h3>
              <div className="status-overview">
                <div className="status-item">
                  <div className="status-dot active-dot"></div>
                  <div className="status-info">
                    <div className="status-count">{chartData.totalActive}</div>
                    <div className="status-label">Active Users</div>
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-dot pending-dot"></div>
                  <div className="status-info">
                    <div className="status-count">{chartData.totalPending}</div>
                    <div className="status-label">Pending</div>
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-dot completed-dot"></div>
                  <div className="status-info">
                    <div className="status-count">{chartData.totalCompleted}</div>
                    <div className="status-label">Completed</div>
                  </div>
                </div>
              </div>
              <div className="quick-stats">
                <div className="quick-stat">
                  <span className="stat-icon">💰</span>
                  <span className="stat-text">Avg. Revenue/Day: KSh {stats ? Math.round(stats.totalRevenue / 7) : 0}</span>
                </div>
                <div className="quick-stat">
                  <span className="stat-icon">👥</span>
                  <span className="stat-text">Avg. Users/Day: {stats ? Math.round(stats.totalPayments / 7) : 0}</span>
                </div>
              </div>
            </div>
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
          <button 
            className={`filter-btn ${filter === 'failed' ? 'active' : ''}`}
            onClick={() => setFilter('failed')}
          >
            Failed
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
            onClick={() => {
              fetchPayments();
              fetchStats();
              fetchChartData();
            }} 
            className="refresh-button"
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" onClick={() => setError('')}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="success-message" onClick={() => setSuccessMessage('')}>
          {successMessage}
        </div>
      )}

      <div className="payments-table-container">
        <div className="table-header">
          <h3>Payment Records ({filteredPayments.length} records)</h3>
          <div className="table-actions">
            <button className="export-btn">📥 Export CSV</button>
          </div>
        </div>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan="10" className="no-data">
                  No payments found
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <React.Fragment key={payment._id}>
                  <tr>
                    <td className="phone-number">{payment.phoneNumber}</td>
                    <td>
                      <span className="package-tag" style={{
                        backgroundColor: PACKAGE_COLORS[payment.package] || '#3498db'
                      }}>
                        {payment.package}
                      </span>
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
                    <td className="actions-cell">
                      <button 
                        className="action-button"
                        onClick={() => setShowActions(showActions === payment._id ? null : payment._id)}
                        title="Manage payment"
                      >
                        {showActions === payment._id ? '✕' : '⚙️'}
                      </button>
                    </td>
                  </tr>
                  
                  {showActions === payment._id && (
                    <tr className="action-row">
                      <td colSpan="10">
                        <div className="action-buttons">
                          <div className="action-section">
                            <h4>Quick Actions</h4>
                            <div className="button-group">
                              <button 
                                className="btn-activate"
                                onClick={() => handleActivate(payment._id)}
                                disabled={payment.status === 'completed' && payment.isCurrentlyActive}
                              >
                                {payment.status === 'completed' && payment.isCurrentlyActive ? '✅ Active' : '▶️ Activate'}
                              </button>
                              <button 
                                className="btn-deactivate"
                                onClick={() => handleDeactivate(payment._id)}
                                disabled={payment.status !== 'completed' || !payment.isCurrentlyActive}
                              >
                                ⏸️ Deactivate
                              </button>
                              <button 
                                className="btn-delete"
                                onClick={() => handleDelete(payment._id)}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                          
                          <div className="action-section">
                            <h4>Manual Activation</h4>
                            <div className="input-group">
                              <input
                                type="number"
                                placeholder="Hours (optional)"
                                value={manualHours}
                                onChange={(e) => setManualHours(e.target.value)}
                                className="hours-input"
                                min="1"
                                max="24"
                              />
                              <button 
                                className="btn-manual"
                                onClick={() => handleActivate(payment._id)}
                              >
                                Activate Now
                              </button>
                            </div>
                          </div>
                          
                          <div className="action-section">
                            <h4>Edit Payment</h4>
                            <div className="edit-form">
                              <select 
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                className="status-select"
                              >
                                <option value="">-- Change Status --</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              
                              <input
                                type="text"
                                placeholder="M-Pesa Code"
                                value={newMpesaCode}
                                onChange={(e) => setNewMpesaCode(e.target.value)}
                                className="mpesa-input"
                              />
                              
                              <input
                                type="number"
                                placeholder="Amount (KSh)"
                                value={newAmount}
                                onChange={(e) => setNewAmount(e.target.value)}
                                className="amount-input"
                                min="0"
                              />
                              
                              <button 
                                className="btn-update"
                                onClick={() => handleUpdate(payment._id)}
                              >
                                Update
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="dashboard-footer">
        <p>Last updated: {new Date().toLocaleTimeString()}</p>
        <p>Total records: {payments.length} | Showing: {filteredPayments.length} | 
          Active: {stats?.activePayments || 0} | Today: {stats?.todaysPayments || 0}
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;