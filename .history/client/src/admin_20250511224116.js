import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';

const Admin = () => {
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);

  const [paymentsData, setPaymentsData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Payments',
        data: [],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        borderWidth: 2,
      },
    ],
  });

  useEffect(() => {
    fetchPaymentsData();
    fetchClientPayments();
  }, []);

  const fetchPaymentsData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/payments/stats'); // Mock API endpoint for payment stats
      setPaymentsData({
        labels: res.data.labels,
        datasets: [
          {
            ...paymentsData.datasets[0],
            data: res.data.data,
          },
        ],
      });
    } catch (err) {
      setStatus({ message: 'Failed to load payment stats', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientPayments = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/payments'); // Mock API endpoint for payment records
      setPayments(res.data.payments);
      setClients(res.data.clients);
    } catch (err) {
      setStatus({ message: 'Failed to load client payments', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (clientId, action) => {
    setLoading(true);
    try {
      const res = await axios.post(`/api/clients/${action}`, { clientId });
      setStatus({
        message: `${action.charAt(0).toUpperCase() + action.slice(1)} successful!`,
        type: 'success',
      });
      fetchClientPayments(); // Refresh the client list
    } catch (err) {
      setStatus({
        message: err.response?.data?.message || 'Action failed',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderClientList = () => {
    return clients.map((client) => (
      <tr key={client.id}>
        <td>{client.username}</td>
        <td>{client.paymentDate}</td>
        <td>{client.amount}</td>
        <td>
          <button
            onClick={() => handleAction(client.id, 'activate')}
            style={styles.actionButton}
          >
            Activate
          </button>
          <button
            onClick={() => handleAction(client.id, 'deactivate')}
            style={styles.actionButton}
          >
            Deactivate
          </button>
          <button
            onClick={() => handleAction(client.id, 'delete')}
            style={styles.deleteButton}
          >
            Delete
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Admin Dashboard</h2>

      <div style={styles.paymentStats}>
        <h3>Payments Overview</h3>
        <div style={styles.statsContainer}>
          <div style={styles.statBox}>
            <h4>Today's Payments</h4>
            <p>{payments.today} Payments</p>
          </div>
          <div style={styles.statBox}>
            <h4>This Month's Payments</h4>
            <p>{payments.month} Payments</p>
          </div>
          <div style={styles.statBox}>
            <h4>This Year's Payments</h4>
            <p>{payments.year} Payments</p>
          </div>
        </div>
      </div>

      <h3 style={styles.subheading}>Client Payment History</h3>
      {status.message && (
        <div style={{ ...styles.status, ...getStatusStyle(status.type) }}>
          {status.message}
        </div>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th>Username</th>
            <th>Payment Date</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>{renderClientList()}</tbody>
      </table>

      <div style={styles.chartContainer}>
        <h3>Payment Trend</h3>
        <Line data={paymentsData} options={chartOptions} />
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  },
  heading: {
    textAlign: 'center',
    color: '#3498db',
    marginBottom: '20px',
  },
  subheading: {
    color: '#2c3e50',
    marginBottom: '10px',
  },
  paymentStats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '30px',
  },
  statsContainer: {
    display: 'flex',
    gap: '20px',
  },
  statBox: {
    padding: '15px',
    backgroundColor: '#ecf0f1',
    borderRadius: '8px',
    width: '30%',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '30px',
  },
  tableHeader: {
    backgroundColor: '#f1f1f1',
  },
  tableCell: {
    padding: '10px',
    border: '1px solid #ddd',
  },
  button: {
    padding: '10px 15px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  actionButton: {
    backgroundColor: '#2ecc71',
    padding: '5px 10px',
    margin: '0 5px',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    padding: '5px 10px',
    margin: '0 5px',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  status: {
    padding: '12px',
    borderRadius: '4px',
    textAlign: 'center',
    marginBottom: '20px',
    fontSize: '16px',
  },
  chartContainer: {
    marginTop: '40px',
  },
};

const chartOptions = {
  responsive: true,
  plugins: {
    title: {
      display: true,
      text: 'Payment Trend Over Time',
    },
    legend: {
      position: 'top',
    },
  },
};

const getStatusStyle = (statusType) => {
  switch (statusType) {
    case 'success':
      return { backgroundColor: '#e8f5e9', color: '#2e7d32' };
    case 'error':
      return { backgroundColor: '#ffebee', color: '#c62828' };
    default:
      return { backgroundColor: '#f5f5f5', color: '#424242' };
  }
};

export default Admin;
