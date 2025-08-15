// Utility to reset notification status for a specific donor (e.g., donor 1)
import React, { useState, useEffect } from 'react';
import './DonorAlertMapPage.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix leaflet's default icon path for markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const center = [12.9716, 77.5946];
const API_BASE_URL = 'http://127.0.0.1:5002';


// No mockDonors needed; will use backend data

export default function DonorAlertMapPage() {
  const [donorsNearby, setDonorsNearby] = useState([]);
  const [notificationStatus, setNotificationStatus] = useState(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('notificationStatus');
    return saved ? JSON.parse(saved) : {};
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('');

  useEffect(() => {
    const savedStatus = localStorage.getItem('notificationStatus');
    if (savedStatus) {
      setNotificationStatus(JSON.parse(savedStatus));
    }
    fetchMapAndDonors();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    localStorage.setItem('notificationStatus', JSON.stringify(notificationStatus));
  }, [notificationStatus]);

  const fetchMapAndDonors = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/donors/map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: center[0],
          longitude: center[1],
          radius: 5
        })
      });
      if (response.ok) {
        const data = await response.json();
        setDonorsNearby(data.donors || []);
        setError('');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      setError(`Backend connection failed: ${error.message}`);
      setDonorsNearby([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (donorId) => {
    setNotificationStatus(prev => ({ ...prev, [donorId]: 'pending' }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/donors/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          donor_id: donorId,
          message: 'Blood Bank : Krithi\'s Blood Bank - Urgent blood donation needed! Take the eligibility test to confirm your availability.'
        })
      });
      if (response.ok) {
        const result = await response.json();
        setNotificationStatus(prev => ({
          ...prev,
          [donorId]: result.status === 'success' ? 'sent' : 'failed'
        }));
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      setNotificationStatus(prev => ({ ...prev, [donorId]: 'failed' }));
    }
  };

  // Poll for donor eligibility response for all 'sent' or 'pending' notifications
  useEffect(() => {
    const interval = setInterval(() => {
      Object.entries(notificationStatus).forEach(async ([donorId, status]) => {
        if (status === 'sent' || status === 'pending') {
          try {
            const eligibilityRes = await fetch('http://localhost:5000/api/receive-eligibility', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ donor_id: donorId })
            });
            if (eligibilityRes.ok) {
              const eligibilityData = await eligibilityRes.json();
              if (eligibilityData.eligibility === 'yes' || eligibilityData.eligibility === true) {
                setNotificationStatus(prev => ({
                  ...prev,
                  [donorId]: 'accepted'
                }));
              } else if (eligibilityData.eligibility === 'no' || eligibilityData.eligibility === false) {
                setNotificationStatus(prev => ({
                  ...prev,
                  [donorId]: 'rejected'
                }));
              }
            }
          } catch (err) {
            // Optionally handle error
          }
        }
      });
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [notificationStatus]);

  const handleSendAllNotifications = () => {
    donorsNearby.forEach(donor => {
      if (!notificationStatus[donor.id]) {
        handleSendNotification(donor.id);
      }
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div>🩸 Loading nearby donors and map...</div>
        <small>Please ensure Flask backend is running on port 5000</small>
      </div>
    );
  }

  // Get unique blood groups from donorsNearby
  const bloodGroups = Array.from(new Set(donorsNearby.map(d => d.blood_group || d.bloodGroup))).filter(Boolean);

  // Filter donors by selected blood group
  const filteredDonors = selectedBloodGroup
    ? donorsNearby.filter(d => (d.blood_group || d.bloodGroup) === selectedBloodGroup)
    : donorsNearby;
  


  return (
    <div className="donor-alert-map-page">
      <div className="page-header">
        <div className="header-text-group">
          <h1 className="page-title">Alert Nearby Donors</h1>
          <div className="title-underline"></div>
          <p className="page-subtitle">Monitor and notify eligible donors within your area</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <br />
          <small>Using fallback data. Start backend with: <code>python backend/app.py</code></small>
        </div>
      )}

      <div className="map-container">
        <h3>🗺️ Donors within 5km radius</h3>
        <div className="map-box">
          <MapContainer
            center={center}
            zoom={14}
            className="leaflet-map"
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {donorsNearby.map(donor => {
              const lat = parseFloat(donor.lat);
              const lon = parseFloat(donor.lon);
              if (isNaN(lat) || isNaN(lon)) return null;
              return (
                <Marker key={donor.donor_id || donor.id} position={[lat, lon]}>
                  <Popup>
                    <div>
                      <strong>{donor.name}</strong><br />
                      Blood Group: {donor.blood_group || donor.bloodGroup}<br />
                      Phone: {donor.phone}<br />
                      Distance: {donor.distance || 'N/A'}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      <div className="notifications-section">
        <div className="section-header">
          <h3>Send Notifications to Nearby Donors</h3>
          <button className="send-all-btn" onClick={handleSendAllNotifications}>
            Send All Notifications
          </button>
        </div>

        {/* Blood group filter dropdown */}
        <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label htmlFor="blood-group-filter" style={{ fontWeight: 500 }}>Filter by Blood Group:</label>
          <select
            id="blood-group-filter"
            value={selectedBloodGroup}
            onChange={e => setSelectedBloodGroup(e.target.value)}
            style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
          >
            <option value="">All</option>
            {bloodGroups.map(bg => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>

        <table className="notifications-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>BLOOD GROUP</th>
              <th>PHONE</th>
              <th>DISTANCE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredDonors.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-donors">
                  No donors found {selectedBloodGroup ? `for ${selectedBloodGroup}` : 'within 5km radius'}
                </td>
              </tr>
            ) : (
              filteredDonors.map(donor => (
                <tr key={donor.donor_id || donor.id}>
                  <td>{donor.name}</td>
                  <td>{donor.blood_group || donor.bloodGroup}</td>
                  <td>{donor.phone}</td>
                  <td>{donor.distance ? `${donor.distance}` : 'N/A'}</td>
                  <td>
                    <span className={`status ${notificationStatus[donor.donor_id || donor.id] || 'not-sent'}`}>
                      {notificationStatus[donor.donor_id || donor.id] === 'pending' ? '⏳ Sending...' : 
                       notificationStatus[donor.donor_id || donor.id] === 'accepted' ? '✅ Accepted' :
                       notificationStatus[donor.donor_id || donor.id] === 'rejected' ? '❌ Rejected' : 
                       notificationStatus[donor.donor_id || donor.id] === 'sent' ? '📤 Sent' :
                       notificationStatus[donor.donor_id || donor.id] === 'failed' ? '⚠️ Failed' : 'Not Sent'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="send-notification-btn"
                      disabled={!!notificationStatus[donor.donor_id || donor.id]}
                      onClick={() => handleSendNotification(donor.donor_id || donor.id)}
                    >
                      {notificationStatus[donor.donor_id || donor.id] ? '✓ Sent' : 'Send Notification'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

