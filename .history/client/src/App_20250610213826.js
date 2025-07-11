import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ServiceForm from './components/ServiceForm';
import Packages from './Packages';
import Hotspot from './Hotspot';
import Receipts from './Receipts';
import Navigation from './Navigation';
import './App.css';
import Admin from './admin';
import axios from 'axios';

// Set axios defaults for API calls
axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const App = () => {
  const [isSidebarVisible, setSidebarVisible] = useState(true);

  const toggleSidebar = () => {
    setSidebarVisible(prev => !prev);
  };

  const Layout = ({ children }) => (
    <div className="app-container">
      <Navigation isVisible={isSidebarVisible} toggle={toggleSidebar} />
      <div className="main-content">
        {children}
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* Redirect root to /packages */}
        <Route path="/" element={<Navigate to="/packages" replace />} />

        {/* Main pages with sidebar layout */}
        <Route path="/packages" element={<Layout><Packages /></Layout>} />
        <Route path="/hotspot" element={<Layout><Hotspot /></Layout>} />
        <Route path="/receipts" element={<Layout><Receipts /></Layout>} />
        <Route path="/service" element={<Layout><ServiceForm /></Layout>} />

        {/* Admin page without sidebar */}
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
};

export default App;