import React from 'react';
import { LayoutDashboard, List, Bell, BarChart2, Moon, Sun, Settings, LogOut, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Sidebar({ toggleDarkMode, darkMode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const menu = [
    { name: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/" },
    { name: "Transactions", icon: <List size={18} />, path: "/transactions" },
    { name: "Fraud Alerts", icon: <Bell size={18} />, path: "/alerts" },
    { name: "Analytics", icon: <BarChart2 size={18} />, path: "/analytics" },
  ];

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="sidebar">
      <div className="brand">
        <div className="logo">🛡️</div>
        <div>
          <h2>FinGuard</h2>
          <p>Fraud Detection</p>
        </div>
      </div>

      <div className="menu">
        {menu.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`menu-item ${location.pathname === item.path ? "active" : ""}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-info-bottom">
          <div className="user-avatar">
            <User size={16} />
          </div>
          <div className="user-details">
            <div className="user-name">{user.fullName || 'User'}</div>
            <div className="user-role">{user.role || 'USER'}</div>
          </div>
        </div>
        
        <div className="footer-actions">
          <button className="footer-btn theme-toggle" onClick={toggleDarkMode}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <button className="footer-btn" onClick={handleLogout}>
            <LogOut size={18} /> 
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}