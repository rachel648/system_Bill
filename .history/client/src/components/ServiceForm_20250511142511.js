// ServiceForm.js
import React, { useState } from 'react';

const ServiceForm = ({ onContinue }) => {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !phone.trim()) return alert("Username and phone are required");
    onContinue({ username, phone });
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-6">
      <h2 className="text-xl font-bold text-center text-blue-600">Internet Service Registration</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 border rounded"
        />
        <input
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-3 border rounded"
        />
        <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600">Continue</button>
      </form>
    </div>
  );
};

export default ServiceForm;
