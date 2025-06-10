import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ServiceForm from './components/ServiceForm';
import Packages from './Packages';
import Hotspot from './Hotspot';
import Receipts from './Receipts';
import Navigation from './Navigation';
import './App.css';
import Admin from './admin';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthContext from './context/AuthContext';

// Set axios defaults for API calls
axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Add response interceptor for global error handling
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Handle specific status codes
      if (error.response.status === 401) {
        // Unauthorized - redirect to login
        window.location.href = '/admin?session_expired=true';
      } else if (error.response.status === 403) {
        toast.error('You do not have permission to perform this action');
      } else if (error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('An error occurred. Please try again.');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }
    return Promise.reject(error);
  }
);

const App = () => {
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [authInfo, setAuthInfo] = useState(() => {
    // Initialize auth state from localStorage if available
    const storedAuth = localStorage.getItem('authInfo');
    return storedAuth ? JSON.parse(storedAuth) : { isAuthenticated: false, user: null };
  });

  // Update localStorage when authInfo changes
  useEffect(() => {
    localStorage.setItem('authInfo', JSON.stringify(authInfo));
  }, [authInfo]);

  const toggleSidebar = () => {
    setSidebarVisible(prev => !prev);
  };

  const login = (userData) => {
    setAuthInfo({
      isAuthenticated: true,
      user: userData
    });
    // Set authorization header for axios
    if (userData.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    }
  };

  const logout = () => {
    setAuthInfo({ isAuthenticated: false, user: null });
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('authInfo');
  };

  const Layout = ({ children }) => (
    <div className="app-container">
      <Navigation 
        isVisible={isSidebarVisible} 
        toggle={toggleSidebar}
        authInfo={authInfo}
        logout={logout}
      />
      <div className={`main-content ${!isSidebarVisible ? 'expanded' : ''}`}>
        {children}
      </div>
    </div>
  );

  // Protected route component
  const ProtectedRoute = ({ element: Element, ...rest }) => {
    const navigate = useNavigate();
    
    useEffect(() => {
      if (!authInfo.isAuthenticated) {
        navigate('/admin', { state: { from: rest.location } });
      }
    }, [authInfo.isAuthenticated, navigate, rest.location]);

    return authInfo.isAuthenticated ? <Element {...rest} /> : null;
  };

  return (
    <AuthContext.Provider value={{ authInfo, login, logout }}>
      <Router>
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        <Routes>
          {/* Redirect root based on authentication */}
          <Route path="/" element={
            authInfo.isAuthenticated ? 
              <Navigate to="/packages" replace /> : 
              <Navigate to="/admin" replace />
          } />

          {/* Main pages with sidebar layout */}
          <Route path="/packages" element={
            <Layout>
              <Packages />
            </Layout>
          } />
          
          <Route path="/hotspot" element={
            <Layout>
              <Hotspot />
            </Layout>
          } />
          
          <Route path="/receipts" element={
            <Layout>
              <ProtectedRoute element={Receipts} />
            </Layout>
          } />
          
          <Route path="/service" element={
            <Layout>
              <ProtectedRoute element={ServiceForm} />
            </Layout>
          } />

          {/* Admin page without sidebar */}
          <Route path="/admin" element={<Admin />} />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;