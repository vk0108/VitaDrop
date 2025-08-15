// src/components/Common/Header.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

const Header = ({ user = {} , onLogout, toggleSidebar, sidebarOpen }) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { label: 'Dashboard', path: '/' },
    { label: 'Donation History', path: '/donation-history' },
    { label: 'Profile', path: '/profile' },
    { label: 'Chatbox', path: '/chatbox' },
  ];

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo-section">
          <div className="logo-icon">🩸</div>
          <span className="logo-text">VitaDrop</span>
        </div>
        <nav className="main-nav">
          {navLinks.map(link => (
            <span
              key={link.label}
              className={`nav-link${location.pathname === link.path ? ' active' : ''}`}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </span>
          ))}
        </nav>
      </div>

      <div className="header-right">
        <div className="header-actions">
          <div className="profile-container">
            <button 
              className="profile-btn"
              onClick={toggleProfileDropdown}
            >
              <img 
                src={user && user.profileImage ? user.profileImage : 'https://ui-avatars.com/api/?name=D&background=8e24aa&color=ffffff&size=40&rounded=true'} 
                alt="Profile"
                className="profile-image"
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', background: '#8e24aa' }}
              />
            </button>

            {profileDropdownOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-menu">
                  <button className="dropdown-item">
                    ℹ️ About Us
                  </button>
                  <button 
                    className="dropdown-item logout"
                    onClick={onLogout}
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay to close dropdowns */}
      {profileDropdownOpen && (
        <div 
          className="dropdown-overlay"
          onClick={() => setProfileDropdownOpen(false)}
        ></div>
      )}
    </header>
  );
};

export default Header;