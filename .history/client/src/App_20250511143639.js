

// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ServiceForm from './components/ServiceForm';
import Packages from './Packages';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ServiceForm />} />
        <Route path="/packages" element={<Packages />} />
      </Routes>
    </Router>
  );
}

export default App;
