import React from 'react';
import ServiceForm from './components/ServiceForm';

const App = () => {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Internet Billing System</h1>
      <ServiceForm />
    </div>
  );
};

export default App;