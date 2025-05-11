import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ServiceForm from './components/ServiceForm';
import Packages from './Packages';
import Hotspot from './Hotspot';
import Receipts from './Receipts';
import './App.css';

const Navigation = () => (
  <div className="navigation">
    <h3>Navigation</h3>
    <ul>
      <li><Link to="/packages" className="link-wifi">WiFi Packages</Link></li>
      <li><Link to="/hotspot" className="link-hotspot">Hotspot</Link></li>
      <li><Link to="/receipts" className="link-receipts">Receipts</Link></li>
    </ul>
  </div>
);

const App = () => {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<ServiceForm />} />

          <Route 
            path="/packages" 
            element={
              <div className="app-container">
                <Navigation />
                <div className="main-content">
                  <Packages />
                </div>
              </div>
            } 
          />
          
          <Route 
            path="/hotspot" 
            element={
              <div className="app-container">
                <Navigation />
                <div className="main-content">
                  <Hotspot />
                </div>
              </div>
            } 
          />
          
          <Route 
            path="/receipts" 
            element={
              <div className="app-container">
                <Navigation />
                <div className="main-content">
                  <Receipts />
                </div>
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
