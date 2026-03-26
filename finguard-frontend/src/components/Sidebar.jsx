import React from 'react';
import { LayoutDashboard, List, Bell, BarChart2, Moon, Settings, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Sidebar() {
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

      <div className="user-info">
        <div className="user-name">{user.fullName || 'User'}</div>
        <div className="user-role">{user.role || 'USER'}</div>
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
        <button className="footer-btn" onClick={handleLogout}>
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );
}