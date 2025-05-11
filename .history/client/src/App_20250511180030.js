import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ServiceForm from './components/ServiceForm';
import Packages from './Packages';

const App = () => {
  return (
    <Router>
      <div style={{ display: 'flex' }}>
        {/* Left Sidebar Navigation */}
        <div style={{ width: '200px', backgroundColor: '#f4f4f4', padding: '20px' }}>
          <h3>Navigation</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li>
              <Link to="/" style={linkStyle}>Service Form</Link>
            </li>
            <li>
              <Link to="/packages" style={linkStyle}>Packages</Link>
            </li>
          </ul>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '20px' }}>
          <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>Internet Billing System</h1>
          <Routes>
            <Route path="/" element={<ServiceForm />} />
            <Route path="/packages" element={<Packages />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

// Inline CSS for the navigation links
const linkStyle = {
  textDecoration: 'none',
  color: '#2c3e50',
  display: 'block',
  margin: '10px 0',
};

export default App;
