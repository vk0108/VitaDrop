import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";


const API_BASE_URL = 'http://127.0.0.1:5002';

const Dashboard = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [pendingHospitalRequests, setPendingHospitalRequests] = useState(0);
  const [donorYesCount, setDonorYesCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Fetch low stock count from inventory
  const fetchLowStockCount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory`);
      if (response.ok) {
        const data = await response.json();
        // Count rows with status 'LOW STOCK' (case-insensitive)
        const lowCount = (data.inventory || []).filter(row => (row.status || '').toLowerCase().includes('low')).length;
        setLowStockCount(lowCount);
      } else {
        setLowStockCount(0);
      }
    } catch {
      setLowStockCount(0);
    }
  };
  // Fetch donor responses with status 'yes'
  const fetchDonorYesCount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bank-hospital-responses`);
      if (response.ok) {
        const data = await response.json();
        // Count responses with 'yes'
        const yesCount = (data.responses || []).filter(r => (r.response || '').toLowerCase() === 'yes').length;
        setDonorYesCount(yesCount);
      } else {
        setDonorYesCount(0);
      }
    } catch {
      setDonorYesCount(0);
    }
  };

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

  // Fetch pending hospital requests
  const fetchPendingHospitalRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts`);
      if (response.ok) {
        const data = await response.json();
        // Count requests not completed or resolved
        const pending = (data.alerts || []).filter(a => a.status && !['Completed', 'Resolved'].includes(a.status)).length;
        setPendingHospitalRequests(pending);
      } else {
        setPendingHospitalRequests(0);
      }
    } catch {
      setPendingHospitalRequests(0);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchPendingHospitalRequests();
    fetchDonorYesCount();
    fetchLowStockCount();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchPendingHospitalRequests();
      fetchDonorYesCount();
      fetchLowStockCount();
    }, 60000); // refresh every 1 min
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
              <span className="card-value">{lowStockCount}</span>
              <div className="card-status urgent">{lowStockCount} Shortages</div>
            </div>
          </div>
          <div className="card">
            <div className="card-icon">📞</div>
            <div className="card-content">
              <h3>DONOR RESPONSES</h3>
              <span className="card-value">{donorYesCount}</span>
              <div className="card-status">Today</div>
            </div>
          </div>
          <div className="card">
            <div className="card-icon">⚡</div>
            <div className="card-content">
              <h3>HOSPITAL REQUESTS</h3>
              <span className="card-value">{pendingHospitalRequests}</span>
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