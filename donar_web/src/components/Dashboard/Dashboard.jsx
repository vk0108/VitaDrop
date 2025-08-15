// src/components/Dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Profile from '../Dashboard/Profile/Profile';
import DonationHistory from '../Dashboard/History/DonationHistory';
import EligibilityCheck from '../Dashboard/Eligibility/EligibilityCheck';
import Notifications from '../Dashboard/Notifications/Notifications';
import Chatbot from '../Chatbot/Chatbot';
import './Dashboard.css';



function DashboardOverview({dashboardData, urgentRequests, setEligibilityRequest, setCurrentView}) {
  return (
    <div className="dashboard-overview" style={{maxWidth:800,margin:'0 auto',padding:'32px 0'}}>
      {/* Blood Group & Status */}
      <div style={{background:'#fff',padding:24,borderRadius:12,boxShadow:'0 2px 8px #0001',marginBottom:24,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h2>🩸 Blood Group</h2>
          <div style={{fontSize:28,fontWeight:'bold'}}>{dashboardData?.blood_group || '-'}</div>
        </div>
        <div>
          <h2>🏆 Total Donations</h2>
          <div style={{fontSize:28,fontWeight:'bold'}}>{dashboardData?.total_donations || '-'}</div>
        </div>
      </div>

      {/* Donation Details */}
      <div style={{background:'#fff',padding:24,borderRadius:12,boxShadow:'0 2px 8px #0001',marginBottom:24}}>
        <h2>📋 Donation Details</h2>
        <div><strong>Last Donation:</strong> {dashboardData?.last_donation_date || '-'}</div>
        <div><strong>Next Eligible Date:</strong> {dashboardData?.next_eligible_date || '-'}</div>
      </div>

      {/* Urgent Requests */}
      <div style={{background:'#fff',padding:24,borderRadius:12,boxShadow:'0 2px 8px #0001'}}>
        <h2>🚨 Urgent Requests</h2>
        {urgentRequests.length === 0 ? (
          <div style={{color:'#888'}}>No urgent requests at the moment.</div>
        ) : (
          [...urgentRequests].reverse().map((req, idx) => (
            <div key={idx} style={{marginBottom: 16}}>
              <div style={{
                color: req.source === 'hospital' ? '#007bff' : '#dc2626',
                fontWeight: 'bold',
                marginBottom: 4
              }}>
                {req.message}
                <span style={{marginLeft:8, color:'#555', fontWeight:'normal', fontSize:'0.95em'}}>
                  {req.timestamp}
                </span>
                {req.source === 'hospital' && (
                  <span style={{marginLeft:8, color:'#007bff', fontWeight:'normal', fontSize:'0.95em'}}>
                    (Hospital)
                  </span>
                )}
              </div>
              <button
                style={{background:'#dc2626', color:'#fff', border:'none', borderRadius:8, padding:'6px 16px', fontWeight:'bold', cursor:'pointer', fontSize:'0.95em'}}
                onClick={() => {
                  setEligibilityRequest(req);
                  setCurrentView('eligibilityChatbot');
                }}
              >
                Check Eligibility
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


const Dashboard = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState('overview');
  const [showHospitalAddress, setShowHospitalAddress] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [eligibilityRequest, setEligibilityRequest] = useState(null); // holds info about which request is being checked

  useEffect(() => {
    const donor_id = user?.donor_id || localStorage.getItem('donor_id');
    if (donor_id) {
      fetch(`http://localhost:5000/api/dashboard/${donor_id}`)
        .then(res => res.json())
        .then(data => setDashboardData(data));
    }
  }, [user]);

  const [urgentRequests, setUrgentRequests] = useState([]);

  useEffect(() => {
    // Fetch from blood bank
    const fetchBloodBank = fetch('http://127.0.0.1:5002/api/donors/1/private_notifications')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && Array.isArray(data.notifications)) {
          return data.notifications.map(n => ({
            message: n.message,
            timestamp: n.timestamp,
            source: 'bloodbank'
          }));
        }
        return [];
      });

    // Fetch from hospital
    const fetchHospital = fetch('http://127.0.0.1:5004/api/donors/1/notification-response')
      .then(res => res.json())
      .then(data => {
        if (data.data && data.data.notification) {
          return [{
            message: data.data.notification.message,
            timestamp: data.data.notification.timestamp,
            source: 'hospital'
          }];
        }
        return [];
      });

    // Combine both
    Promise.all([fetchBloodBank, fetchHospital]).then(([bloodBankRequests, hospitalRequests]) => {
      setUrgentRequests([...bloodBankRequests, ...hospitalRequests]);
    });
  }, []);

  const renderCurrentView = () => {
    switch(currentView) {
      case 'profile':
        return <Profile user={user} />;
      case 'history':
        return <DonationHistory user={user} />;
      case 'eligibilityChatbot':
        return (
          <div style={{maxWidth:800,margin:'0 auto',padding:'32px 0'}}>
            <Chatbot
              user={user}
              requestSource={eligibilityRequest?.source}
              onStoreEligibilityResponse={async (response) => {
                const donor_id = user?.donor_id || localStorage.getItem('donor_id');
                if (!donor_id) return;
                if (eligibilityRequest?.source === 'hospital') {
                  await fetch('http://localhost:5000/api/hospital/store-eligibility-response', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ donor_id, eligibility: response.eligible })
                  });
                } else {
                  await fetch('http://localhost:5000/api/store-eligibility-response', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ donor_id, eligibility: response.eligible })
                  });
                }
              }}
              onClose={() => {
                setCurrentView('overview');
                setEligibilityRequest(null);
              }}
            />
          </div>
        );
      case 'eligibility':
        return <DashboardOverview dashboardData={dashboardData} urgentRequests={urgentRequests} setEligibilityRequest={setEligibilityRequest} setCurrentView={setCurrentView} />;
      case 'notifications':
        return <Notifications user={user} />;
      default:
        return <DashboardOverview dashboardData={dashboardData} urgentRequests={urgentRequests} setEligibilityRequest={setEligibilityRequest} setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className="dashboard">
      {/* Animated Background Container */}
      <div className="background-container">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="dots-pattern"></div>
        <div className="floating-drop" style={{top: '20%', left: '10%', animationDelay: '0s'}}>
          <span className="drop-icon">🩸</span>
        </div>
        <div className="floating-drop" style={{top: '60%', right: '15%', animationDelay: '2s'}}>
          <span className="drop-icon">🩸</span>
        </div>
        <div className="floating-drop" style={{bottom: '30%', left: '70%', animationDelay: '4s'}}>
          <span className="drop-icon">🩸</span>
        </div>
      </div>

      <div className="dashboard-container">
        <main className="main-content">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;