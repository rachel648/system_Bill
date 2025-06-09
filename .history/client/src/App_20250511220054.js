import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ServiceForm from './components/ServiceForm';
import Packages from './Packages';
import Hotspot from './Hotspot';
import Receipts from './Receipts';
import Navigation from './Navigation';
import './App.css';

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
        <Route path="/" element={<ServiceForm />} />
        <Route path="/packages" element={<Layout><Packages /></Layout>} />
        <Route path="/hotspot" element={<Layout><Hotspot /></Layout>} />
        <Route path="/receipts" element={<Layout><Receipts /></Layout>} />
      </Routes>
    </Router>
  );
};

export default App;
