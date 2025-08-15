import React, { useState, useEffect } from 'react';
import { Heart, MapPin, Phone, Mail, Calendar, User, Edit3, MessageCircle } from 'lucide-react';
import './Profile.css';





function Profile({ user }) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [pulseCount, setPulseCount] = useState(0);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Prefer donor_id from user prop, fallback to localStorage for backward compatibility
    const donor_id = user?.donor_id || localStorage.getItem('donor_id');
    if (donor_id) {
      fetch(`http://localhost:5000/api/profile/${donor_id}`)
        .then(res => res.json())
        .then(data => setProfile(data));
    }
  }, [user]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    const pulseInterval = setInterval(() => {
      setPulseCount(prev => prev + 1);
    }, 2000);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(pulseInterval);
    };
  }, []);


  // Fallback profile picture
  const profilePicture = profile?.username
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=8e24aa&color=ffffff&size=128&rounded=true`
    : 'https://ui-avatars.com/api/?name=D&background=8e24aa&color=ffffff&size=128&rounded=true';

  return (
    <div className="profile-page">
      {/* Dynamic Background Elements */}
      <div className="background-container">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="floating-drop"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          >
            <div className="drop-icon">🩸</div>
          </div>
        ))}
        <div 
          className="dots-pattern"
          style={{
            transform: `translate(${mousePos.x * 0.01}px, ${mousePos.y * 0.01}px)`
          }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="content-container">
        <div 
          className="profile-card-wrapper"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="profile-card">
            <div className="profile-header">
              <div className="header-overlay"></div>
              <div className="header-content">
                <div className="profile-info-section">
                  <div className="profile-picture-container">
                    <img
                      src={profilePicture}
                      alt={profile?.username || 'Donor'}
                      className="profile-picture"
                    />
                    <div className="status-indicator">
                      <div className="status-dot"></div>
                    </div>
                  </div>
                  <div className="profile-details">
                    <div className="name-and-edit">
                      <h1 className="profile-name">{profile?.username || '-'}</h1>
                      <button className="edit-btn">
                        <Edit3 className="edit-icon" />
                      </button>
                    </div>
                    <div className="profile-badges">
                      <div className="blood-group-badge">
                        {profile?.blood_group || '-'}
                      </div>
                      <div className="availability-badge">
                        <div className="availability-dot"></div>
                        <span>Available</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Stats Bar */}
            <div className="stats-bar">
              <div className="stats-container">
                <div className="stat-item">
                  <div className="stat-content">
                    <div className="stat-number">
                      <span className="number-text">{profile?.total_donations || '-'}</span>
                    </div>
                    <div className="stat-label">Donations</div>
                  </div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <div className="stat-content">
                    <div className="stat-number">
                      <span className="number-text">{profile?.years_active ? `${profile.years_active}+` : '-'}</span>
                    </div>
                    <div className="stat-label">Years Active</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Sections */}
            <div className="info-sections">
              {/* Basic Info */}
              <div className="info-section">
                <h3 className="section-title">
                  <User className="section-icon" />
                  Basic Information
                </h3>
                <div className="info-items">
                  <div className="info-item">
                    <span className="info-label">
                      <Calendar className="info-icon" />
                      Date of Birth
                    </span>
                    <span className="info-value">{profile?.dob || '-'}</span>
                  </div>
                  {/* Gender not available in backend, so skip */}
                </div>
              </div>

              {/* Contact Info */}
              <div className="info-section">
                <h3 className="section-title">
                  <Phone className="section-icon" />
                  Contact Information
                </h3>
                <div className="info-items">
                  <div className="info-item clickable">
                    <span className="info-label">
                      <Mail className="info-icon" />
                      Email
                    </span>
                    <span className="info-value">{profile?.email || '-'}</span>
                  </div>
                  <div className="info-item clickable">
                    <span className="info-label">
                      <Phone className="info-icon" />
                      Phone
                    </span>
                    <span className="info-value">{profile?.phone || '-'}</span>
                  </div>
                  <div className="info-item address-item">
                    <div className="address-content">
                      <span className="info-label">
                        <MapPin className="info-icon" />
                        Address
                      </span>
                      <div className="address-details">
                        <div className="address-text">{profile?.address || '-'}</div>
                        {/* Map link can be generated if address is present */}
                        {profile?.address && (
                          <a 
                            href={`https://maps.google.com/?q=${encodeURIComponent(profile.address)}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="map-link"
                          >
                            <MapPin className="map-icon" />
                            View on Map
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;