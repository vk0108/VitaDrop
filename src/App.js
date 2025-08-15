import React, { useState } from 'react';
import './App.css';

function App() {
  const [showAbout, setShowAbout] = useState(false);
  const [showLearn, setShowLearn] = useState(false);
  const [selectedType, setSelectedType] = useState('O-');

  // Blood type compatibility data
  const bloodData = {
    'O-': {
      take: ['O-'],
      give: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
    },
    'O+': {
      take: ['O+', 'O-'],
      give: ['O+', 'A+', 'B+', 'AB+'],
    },
    'A-': {
      take: ['O-', 'A-'],
      give: ['A+', 'A-', 'AB+', 'AB-'],
    },
    'A+': {
      take: ['O-', 'O+', 'A-', 'A+'],
      give: ['A+', 'AB+'],
    },
    'B-': {
      take: ['O-', 'B-'],
      give: ['B+', 'B-', 'AB+', 'AB-'],
    },
    'B+': {
      take: ['O-', 'O+', 'B-', 'B+'],
      give: ['B+', 'AB+'],
    },
    'AB-': {
      take: ['O-', 'A-', 'B-', 'AB-'],
      give: ['AB+', 'AB-'],
    },
    'AB+': {
      take: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
      give: ['AB+'],
    },
  };
  const bloodTypes = ['A+', 'O+', 'B+', 'AB+', 'A-', 'O-', 'B-', 'AB-'];
  if (showAbout) {
    return (
      <div className="about-bg">
        <div className="about-modal">
          <div className="about-header">
            <h1>
              <span role="img" aria-label="drop">🩸</span> VitaDrop
            </h1>
            <div className="about-subtitle">
              Blood Donation Management Platform
            </div>
          </div>
          <div className="about-content">
            <h2>About VitaDrop</h2>
            <h3>Our Mission</h3>
            <div className="about-mission">
              VitaDrop is dedicated to bridging the gap between blood donors and those in need. We provide a comprehensive platform that connects hospitals, blood banks, and donors to ensure life-saving blood is available when and where it's needed most.
            </div>
            <div className="about-cards">
              <div className="about-card">
                <div className="about-card-icon">👥</div>
                <div className="about-card-title">For Donors</div>
                <div className="about-card-desc">Register as a donor, track your donations, receive notifications for urgent needs, and make a difference in someone's life.</div>
              </div>
              <div className="about-card">
                <div className="about-card-icon">📄</div>
                <div className="about-card-title">For Hospitals</div>
                <div className="about-card-desc">Manage blood inventory, request specific blood types, track patient needs, and coordinate with blood banks efficiently.</div>
              </div>
              <div className="about-card">
                <div className="about-card-icon">💧</div>
                <div className="about-card-title">For Blood Banks</div>
                <div className="about-card-desc">Monitor blood storage, manage expiry dates, coordinate with hospitals, and organize donation drives effectively.</div>
              </div>
            </div>
            <button className="about-back-btn" onClick={() => setShowAbout(false)}>
              Back to Login
            </button>
          </div>
        </div>
        <footer className="footer">
          <div className="footer-content">
            © 2025 VitaDrop. All rights reserved.
          </div>
        </footer>
      </div>
    );
  }

  if (showLearn) {
    const selected = bloodData[selectedType];
    return (
      <div className="about-bg">
        <div className="learn-modal">
          <h1 className="learn-title">Learn About Donation</h1>
          <div className="learn-blood-row">
            <div className="learn-blood-label">Select your Blood Type</div>
            <div className="learn-blood-types">
              {bloodTypes.map(type => (
                <button
                  key={type}
                  className={`learn-blood-btn${selectedType === type ? ' selected' : ''}`}
                  onClick={() => setSelectedType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="learn-content-row learn-cards-row">
            <div className="learn-box learn-take">
              <div className="learn-icon learn-icon-take" />
              <div className="learn-take-title">You can take from</div>
              <div className="learn-take-list">{selected.take.join('  ')}</div>
            </div>
            <div className="learn-box learn-give">
              <div className="learn-icon learn-icon-give" />
              <div className="learn-give-title">You can give to</div>
              <div className="learn-give-list">{selected.give.join('  ')}</div>
            </div>
          </div>
          <div className="learn-img-caption" style={{textAlign: 'center', marginTop: '1em'}}>
            One Blood Donation can save upto <span className="learn-img-caption-highlight">Three Lives</span>
          </div>
          <button className="about-back-btn" onClick={() => setShowLearn(false)}>
            Back to Login
          </button>
        </div>
        <footer className="footer">
          <div className="footer-content">
            © 2025 VitaDrop. All rights reserved.
          </div>
        </footer>
      </div>
    );
  }
        

  return (
    <div className="landing-bg">
      <header className="landing-header">
        <div className="header-title-row">
          <h1 className="landing-title">
            VitaDrop <span role="img" aria-label="drop">🩸</span>
          </h1>
          <div className="header-links">
            <button className="about-btn" onClick={() => setShowAbout(true)}>
              About Us
            </button>
            <button className="about-btn" onClick={() => setShowLearn(true)}>
              Learn about donation
            </button>
          </div>
        </div>
        <div className="landing-subtitle">
          Saving lives, one drop at a time
        </div>
      </header>
      <main className="landing-main">
        <h2 className="landing-role-title">Choose Your Role</h2>
        <div className="role-cards">
          {/* Donor Card */}
          <div className="role-card">
            <div className="role-icon donor">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 25C16 25 7 19 7 13.5C7 10.4624 9.46243 8 12.5 8C14.0212 8 15.4212 8.7375 16.25 9.875C17.0788 8.7375 18.4788 8 20 8C23.0376 8 25.5 10.4624 25.5 13.5C25.5 19 16 25 16 25Z" fill="white"/>
              </svg>
            </div>
            <div className="role-title">Donor</div>
            <div className="role-desc">Register as a blood donor and help save lives</div>
            <button className="role-btn" onClick={() => window.open('http://localhost:3000/', '_blank')}>Get Started</button>
          </div>
          {/* Hospital Card */}
          <div className="role-card">
            <div className="role-icon hospital">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="10" width="12" height="12" rx="2" fill="white"/>
                <rect x="13" y="13" width="6" height="1.5" rx="0.75" fill="#e53935"/>
                <rect x="13" y="16" width="6" height="1.5" rx="0.75" fill="#e53935"/>
                <rect x="13" y="19" width="6" height="1.5" rx="0.75" fill="#e53935"/>
              </svg>
            </div>
            <div className="role-title">Hospital</div>
            <div className="role-desc">Access emergency blood requests and manage needs</div>
            <button className="role-btn" onClick={() => window.open('http://localhost:3004/', '_blank')}>Get Started</button>
          </div>
          {/* Blood Bank Card */}
          <div className="role-card">
            <div className="role-icon bloodbank">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 7C16 7 20 15 20 21C20 24.3137 18.2091 27 16 27C13.7909 27 12 24.3137 12 21C12 15 16 7 16 7Z" fill="white"/>
              </svg>
            </div>
            <div className="role-title">Blood Bank</div>
            <div className="role-desc">Manage inventory and coordinate with facilities</div>
            <button className="role-btn" onClick={() => window.open('http://localhost:3002/', '_blank')}>Get Started</button>
          </div>
        </div>
      </main>
      <footer className="footer">
        <div className="footer-content">
          © 2025 VitaDrop. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default App;
