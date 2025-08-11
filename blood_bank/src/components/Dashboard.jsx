import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";


const API_BASE_URL = 'http://127.0.0.1:5000';

const Dashboard = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setError('');
      } else {
        setError('Failed to fetch notifications');
      }
    } catch (err) {
      setError('Backend not reachable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every 1 min
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="title-section">
          <h1 className="dashboard-title">
            Summary
            <div className="heading-accent"></div>
          </h1>
          <p className="heading-subtitle">
            Overview of today's blood bank activity
          </p>
        </div>
        <div className="refresh-time">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="dashboard-flex-row">
        <div className="dashboard-summary-col">
          <div className="card alert-card">
            <div className="card-icon">🚨</div>
            <div className="card-content">
              <h3>ACTIVE ALERTS</h3>
              <span className="card-value">{notifications.filter(n => n.status === 'Pending').length}</span>
              <div className="card-status urgent">{notifications.filter(n => n.type === 'Inventory Shortage').length} Shortages</div>
            </div>
          </div>
          <div className="card">
            <div className="card-icon">📞</div>
            <div className="card-content">
              <h3>DONOR RESPONSES</h3>
              <span className="card-value">{notifications.filter(n => n.type === 'Donor Response').length}</span>
              <div className="card-status">Today</div>
            </div>
          </div>
          <div className="card">
            <div className="card-icon">⚡</div>
            <div className="card-content">
              <h3>HOSPITAL REQUESTS</h3>
              <span className="card-value">{notifications.filter(n => n.type === 'Hospital Request').length}</span>
              <div className="card-status urgent">Active</div>
            </div>
          </div>
        </div>
        <div className="dashboard-notifications">
          {loading ? (
            <div>Loading notifications...</div>
          ) : error ? (
            <div className="error-banner">{error}</div>
          ) : notifications.length === 0 ? (
            <div>No notifications yet.</div>
          ) : (
            <div className="notifications-list-pretty">
              {notifications.slice(0, 5).map((notif, idx) => {
                const type = notif.type || 'Alert';
                const message = notif.message || 'No message';
                const timestamp = notif.timestamp || '';
                let icon = '🔔';
                if (type === 'Hospital Request') icon = '🏥';
                else if (type === 'Inventory Shortage') icon = '⚠️';
                else if (type === 'Donor Response') icon = '🩸';
                return (
                  <div key={notif.alert_id || idx} className={`notif-pretty notif-${type.toLowerCase().replace(/\s/g, '-')}`}>
                    <span className="notif-pretty-icon">{icon}</span>
                    <div className="notif-pretty-content">
                      <span className="notif-pretty-type">{type}</span>
                      <span className="notif-pretty-message">{message}</span>
                      <span className="notif-pretty-time">{timestamp}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;