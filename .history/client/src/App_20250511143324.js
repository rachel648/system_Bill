// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ServiceForm from './components/ServiceForm';
import Packages from './Packages';

const App = () => {
  return (
    <Router>
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>Internet Billing System</h1>
        <Routes>
          <Route path="/" element={<ServiceForm />} />
          <Route path="/packages" element={<Packages />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
