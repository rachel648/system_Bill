// components/ServiceForm.js
const handleRegister = async () => {
  setStatus('Processing...');
  try {
    const res = await axios.post('http://localhost:5000/api/users/register', {
      username,
      serviceType,
      package: packageType,
      duration
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    setStatus(`Success! Service active until ${new Date(res.data.user.endTime).toLocaleDateString()}`);
  } catch (err) {
    const errorMessage = err.response?.data?.message || 
                        err.message || 
                        'Registration failed';
    console.error('Registration error:', err.response?.data || err);
    setStatus(`Error: ${errorMessage}`);
  }
};