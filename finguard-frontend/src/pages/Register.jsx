// Register.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/api';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    if (name === 'password') {
      // Simple password strength calculation
      let strength = 0;
      if (value.length >= 8) strength++;
      if (/[A-Z]/.test(value)) strength++;
      if (/[0-9]/.test(value)) strength++;
      if (/[^A-Za-z0-9]/.test(value)) strength++;
      setPasswordStrength(strength);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      const { accessToken, refreshToken, user } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = () => {
    const colors = ['', '#ff4444', '#ffaa44', '#44ff44', '#00cc00'];
    return colors[passwordStrength];
  };

  return (
    <div className="auth-page">
      <div className="auth-grid">
        {/* Left Panel - Brand/Info */}
        <div className="auth-info-panel">
          <div className="info-content">
            <div className="brand-icon">🛡️</div>
            <h1>FinGuard</h1>
            <p className="tagline">Join the Future of Fraud Prevention</p>
            <div className="feature-list">
              <div className="feature">
                <span>✓</span> Real-time transaction monitoring
              </div>
              <div className="feature">
                <span>✓</span> AI-powered anomaly detection
              </div>
              <div className="feature">
                <span>✓</span> Instant fraud alerts
              </div>
              <div className="feature">
                <span>✓</span> Comprehensive reporting
              </div>
            </div>
            <div className="trust-badge">
              <span>🔐</span> Used by 500+ financial institutions
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="auth-form-panel">
          <div className="form-container">
            <div className="form-header">
              <h2>Create Account</h2>
              <p>Start protecting your transactions</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-icon">
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <div className="input-icon">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="hello@finguard.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-icon">
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Create a strong password"
                  />
                </div>
                {formData.password && (
                  <div className="password-strength">
                    <div 
                      className="strength-bar" 
                      style={{ width: `${(passwordStrength / 4) * 100}%`, backgroundColor: getStrengthColor() }}
                    ></div>
                    <span className="strength-text" style={{ color: getStrengthColor() }}>
                      {getStrengthText()}
                    </span>
                  </div>
                )}
                <p className="hint">Use 8+ chars with letters, numbers & symbols</p>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating account...' : 'Get Started'}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account? <a href="/login">Sign In</a>
            </p>

            <div className="divider">or</div>

          
            <p className="terms">
              By signing up, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}