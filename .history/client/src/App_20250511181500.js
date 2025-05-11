import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ServiceForm from './components/ServiceForm';
import Packages from './Packages';
import Hotspot from './Hotspot'; // Assuming you have a Hotspot component
import SignIn from './SignIn'; // Create a SignIn component
import Registration from './Registration'; // Create a Registration component

const App = () => {
  return (
    <Router>
      <div>
        {/* Routes for ServiceForm without sidebar */}
        <Routes>
          <Route path="/" element={<ServiceForm />} />
        </Routes>

        {/* WiFi Packages and Hotspot Routes with Sidebar Navigation for SignIn and Registration */}
        <div style={{ display: 'flex' }}>
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

          <div style={{ flex: 1, padding: '20px' }}>
            <Routes>
              <Route path="/packages" element={<Packages />} />
              <Route path="/hotspot" element={<Hotspot />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/registration" element={<Registration />} />
            </Routes>
          </div>
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
