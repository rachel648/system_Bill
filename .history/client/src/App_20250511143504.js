import React from 'react';
import ServiceForm from './components/ServiceForm';


const App = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>Internet Billing System</h1>
      <ServiceForm />
    </div>
  );
};

export default App;