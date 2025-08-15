// src/components/Common/Sidebar.jsx
import React from 'react';
import './Sidebar.css';

const Sidebar = ({ isOpen, currentView, setCurrentView, toggleSidebar }) => {
  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: '🏠', badge: null },
    { id: 'profile', label: 'My Profile', icon: '👤', badge: null },
    { id: 'history', label: 'Donation History', icon: '📋', badge: null },
    { id: 'eligibility', label: 'Check Eligibility', icon: '✅', badge: null },
    { id: 'notifications', label: 'Notifications', icon: '🔔', badge: 3 },
    { id: 'appointments', label: 'Appointments', icon: '📅', badge: null },
    { id: 'achievements', label: 'Achievements', icon: '🏆', badge: null },
    { id: 'health', label: 'Health Tracker', icon: '💪', badge: null },
    { id: 'events', label: 'Blood Drives', icon: '🎪', badge: 2 },
    { id: 'referrals', label: 'Refer Friends', icon: '👥', badge: null },
    { id: 'certificates', label: 'Certificates', icon: '📜', badge: null },
    { id: 'settings', label: 'Settings', icon: '⚙️', badge: null },
  ];

  const handleMenuClick = (itemId) => {
    setCurrentView(itemId);
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
      toggleSidebar();
    }
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={toggleSidebar}></div>
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🩸</div>
            <span className="sidebar-logo-text">BloodLink</span>
          </div>
          <button className="sidebar-close" onClick={toggleSidebar}>✕</button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Main Menu</div>
            <ul className="nav-list">
              {menuItems.slice(0, 5).map(item => (
                <li key={item.id} className="nav-item">
                  <button 
                    className={`nav-link ${currentView === item.id ? 'active' : ''}`}
                    onClick={() => handleMenuClick(item.id)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-text">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Activities</div>
            <ul className="nav-list">
              {menuItems.slice(5, 9).map(item => (
                <li key={item.id} className="nav-item">
                  <button 
                    className={`nav-link ${currentView === item.id ? 'active' : ''}`}
                    onClick={() => handleMenuClick(item.id)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-text">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Account</div>
            <ul className="nav-list">
              {menuItems.slice(9).map(item => (
                <li key={item.id} className="nav-item">
                  <button 
                    className={`nav-link ${currentView === item.id ? 'active' : ''}`}
                    onClick={() => handleMenuClick(item.id)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-text">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="quick-stats">
            <div className="quick-stat">
              <div className="stat-value">12</div>
              <div className="stat-label">Total Donations</div>
            </div>
            <div className="quick-stat">
              <div className="stat-value">36</div>
              <div className="stat-label">Lives Saved</div>
            </div>
          </div>
          
          <div className="emergency-alert">
            <div className="alert-icon">🚨</div>
            <div className="alert-content">
              <div className="alert-title">Emergency Request</div>
              <div className="alert-message">O+ needed at City Hospital</div>
            </div>
            <button className="alert-action">Respond</button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;