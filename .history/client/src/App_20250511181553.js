import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ServiceForm from './components/ServiceForm';
import Packages from './Packages';
import Hotspot from './Hotspot'; // Assuming you have a Hotspot component

const App = () => {
  return (
    <Router>
      <div>
        {/* WiFi Packages and Hotspot Routes with Sidebar Navigation */}
        <Routes>
          <Route path="/" element={<ServiceForm />} />  {/* No navigation on ServiceForm */}
          <Route 
            path="/packages" 
            element={
              <div style={{ display: 'flex' }}>
                {/* Navigation Sidebar for WiFi Packages and Hotspot */}
                <div style={{ width: '200px', backgroundColor: '#f4f4f4', padding: '20px' }}>
                  <h3>Navigation</h3>
                  <ul style={{ listStyleType: 'none', padding: 0 }}>
                    <li>
                      <Link to="/packages" style={linkStyle}>WiFi Packages</Link>
                    </li>
                    <li>
                      <Link to="/hotspot" style={linkStyle}>Hotspot</Link>
                    </li>
                  </ul>
                </div>
                
                {/* Main content for WiFi Packages */}
                <div style={{ flex: 1, padding: '20px' }}>
                  <Packages />
                </div>
              </div>
            } 
          />
          
          <Route 
            path="/hotspot" 
            element={
              <div style={{ display: 'flex' }}>
                {/* Navigation Sidebar for WiFi Packages and Hotspot */}
                <div style={{ width: '200px', backgroundColor: '#f4f4f4', padding: '20px' }}>
                  <h3>Navigation</h3>
                  <ul style={{ listStyleType: 'none', padding: 0 }}>
                    <li>
                      <Link to="/packages" style={linkStyle}>WiFi Packages</Link>
                    </li>
                    <li>
                      <Link to="/hotspot" style={linkStyle}>Hotspot</Link>
                    </li>
                  </ul>
                </div>

                {/* Main content for Hotspot */}
                <div style={{ flex: 1, padding: '20px' }}>
                  <Hotspot />
                </div>
              </div>
            } 
          />
        </Routes>
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
