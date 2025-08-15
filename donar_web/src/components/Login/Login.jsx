// src/components/Login/Login.jsx
/*import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Mock user data
      const userData = {
        id: 1,
        name: 'John Doe',
        email: formData.email,
        bloodType: 'O+',
        phone: '+1234567890',
        address: '123 Main St, City, State 12345',
        dateOfBirth: '1990-05-15',
        lastDonation: '2024-06-15',
        totalDonations: 12,
        eligibleDate: '2024-09-15',
        profileImage: 'https://via.placeholder.com/150'
      };
      
      onLogin(userData);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        <div className="blood-cells"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <div className="logo-icon">🩸</div>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to continue your life-saving journey</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="input-container">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                required
                className="form-input"
              />
              <div className="input-icon">📧</div>
            </div>
          </div>

          <div className="form-group">
            <div className="input-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                className="form-input"
              />
              <div 
                className="input-icon password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </div>
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-container">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
              />
              <div className="custom-checkbox">
                {formData.rememberMe && <span className="checkmark">✓</span>}
              </div>
              <span>Remember me</span>
            </label>
            <a href="#" className="forgot-link">Forgot Password?</a>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading && <div className="loading-spinner"></div>}
            {loading ? 'Signing In...' : 'Sign In to Save Lives'}
          </button>
        </form>

        <div className="register-link">
          New donor? <a href="#" onClick={() => alert('Registration page coming soon!')}>Create your account</a>
        </div>
      </div>
    </div>
  );
};

export default Login;*/


import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/donor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }
  onLogin(data);
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #dc2626, #ef4444)'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '40px', 
        borderRadius: '20px',
        width: '400px',
        textAlign: 'center'
      }}>
        <h1>🩸 VitaDrop Login</h1>
        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <input 
            type="email" 
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ 
              width: '100%', 
              padding: '15px', 
              margin: '10px 0',
              border: '2px solid #ddd',
              borderRadius: '10px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
          <input 
            type="password" 
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ 
              width: '100%', 
              padding: '15px', 
              margin: '10px 0',
              border: '2px solid #ddd',
              borderRadius: '10px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
          {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
          <button 
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '15px', 
              margin: '20px 0',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Signing In...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;