// Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api/api';
import { Eye } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberMeEmail');
    const savedPassword = localStorage.getItem('rememberMePassword');
    
    if (savedEmail && savedPassword) {
      setFormData(prev => ({ ...prev, email: savedEmail, password: savedPassword }));
      setRememberMe(true);
    } else if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { accessToken, refreshToken, user } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      if (rememberMe) {
        localStorage.setItem('rememberMeEmail', formData.email);
        localStorage.setItem('rememberMePassword', formData.password);
      } else {
        localStorage.removeItem('rememberMeEmail');
        localStorage.removeItem('rememberMePassword');
      }

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-grid">
        {/* Left Panel - Brand/Info */}
        <div className="auth-info-panel">
          <div className="info-content">
            <div className="brand-icon">🛡️</div>
            <h1>FinGuard</h1>
            <p className="tagline">Advanced Fraud Detection System</p>
            <div className="security-badges">
              <span>🔒 Bank-Grade Security</span>
              <span>⚡ Real-time Monitoring</span>
              <span>🤖 AI-Powered Analysis</span>
            </div>
            <div className="stats">
              <div className="stat">
                <span className="stat-number">99.9%</span>
                <span className="stat-label">Detection Rate</span>
              </div>
              <div className="stat">
                <span className="stat-number">&lt;1s</span>
                <span className="stat-label">Response Time</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="auth-form-panel">
          <div className="form-container">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your account</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-icon">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="admin@finguard.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-icon" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onMouseEnter={() => setShowPassword(true)}
                    onMouseLeave={() => setShowPassword(false)}
                    onTouchStart={() => setShowPassword(true)}
                    onTouchEnd={() => setShowPassword(false)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px'
                    }}
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>

              {/* <div className="form-options">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  /> Remember me
                </label>
              </div> */}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <p className="auth-switch">
              Don't have an account? <Link to="/register">Create Account</Link>
            </p>

            <div className="divider">or</div>

           
          </div>
        </div>
      </div>
    </div>
  );
}