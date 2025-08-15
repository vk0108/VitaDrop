import React, { useState, useEffect } from "react";
import "./IncomingAlerts.css";



const getUrgencyClass = (urgency) => {
  switch (urgency) {
    case "Critical":
      return "urgency-critical";
    case "Urgent":
      return "urgency-urgent";
    case "Normal":
      return "urgency-normal";
    default:
      return "";
  }
};

const IncomingAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Fetch alerts from backend
  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://127.0.0.1:5002/api/alerts");
        const data = await res.json();
        if (data.status === "success") {
          setAlerts(data.alerts);
          setError("");
        } else {
          setError(data.message || "Failed to load alerts");
        }
      } catch (err) {
        setError("Could not connect to backend");
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  // Dynamically extract all unique types (components) from alerts
  const allTypes = Array.from(new Set(alerts.map(a => a.component).filter(Boolean)));
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmationMsg, setConfirmationMsg] = useState("");

  // Complete task: call backend to resolve alert and update inventory
  const handleCompleteTask = async (alert, idx) => {
    const confirmed = window.confirm(`Mark this alert for ${alert.hospital_name} (${alert.blood_group}, ${alert.component}) as completed? This will update inventory management.`);
    if (!confirmed) return;
    try {
      const res = await fetch('http://127.0.0.1:5002/api/alerts/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: alert.alert_id,
          units_used: alert.units_needed,
          blood_group: alert.blood_group,
          component: alert.component
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        // Re-fetch alerts to update status
  const res2 = await fetch("http://127.0.0.1:5002/api/alerts");
        const data2 = await res2.json();
        if (data2.status === "success") {
          setAlerts(data2.alerts);
        }
        setConfirmationMsg("Task completed and inventory updated!");
        setTimeout(() => setConfirmationMsg(""), 2500);
      } else {
        setConfirmationMsg(data.message || "Failed to complete task");
        setTimeout(() => setConfirmationMsg(""), 2500);
      }
    } catch (err) {
      setConfirmationMsg("Could not connect to backend");
      setTimeout(() => setConfirmationMsg(""), 2500);
    }
  };

  // Only show alerts that are real hospital alerts (must have hospital_name and units_needed)
  const filteredAlerts = alerts.filter((alert) => {
    if (!alert.hospital_name || !alert.units_needed) return false;
    const matchesSearch =
      (alert.hospital_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (alert.blood_group || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency =
      urgencyFilter === "all" ||
      (alert.urgency || "").toLowerCase() === urgencyFilter;
    const matchesType =
      typeFilter === "all" ||
      (alert.component || "").toLowerCase() === typeFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (alert.status || "").toLowerCase() === statusFilter;
    return matchesSearch && matchesUrgency && matchesType && matchesStatus;
  });

  // Only count pending alerts for critical/urgent
  const stats = {
    total: alerts.length,
    critical: alerts.filter((a) => a.urgency === "Critical" && a.status === "Pending").length,
    urgent: alerts.filter((a) => a.urgency === "Urgent" && a.status === "Pending").length,
    pending: alerts.filter((a) => a.status === "Pending").length,
    completed: alerts.filter((a) => a.status === "Resolved").length,
  };

  // Format date and time from alert.date and alert.time
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [dd, mm, yyyy] = dateStr.split("-");
    return `${dd}-${mm}-${yyyy}`;
  };
  const formatTime = (timeStr) => timeStr || "";

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <div className="header-main">
          <div className="title-section">
            <h2 className="alerts-heading">
              Hospital Alerts
              <div className="heading-accent"></div>
            </h2>
            <p className="heading-subtitle">Real-time blood requirement updates</p>
          </div>
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item critical">
              <span className="stat-value">{stats.critical}</span>
              <span className="stat-label">Critical</span>
            </div>
            <div className="stat-item urgent">
              <span className="stat-value">{stats.urgent}</span>
              <span className="stat-label">Urgent</span>
            </div>
            <div className="stat-item pending">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-item" style={{borderTop: '3px solid #218838'}}>
              <span className="stat-value">{stats.completed}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>
        <div className="alerts-controls">
          <div className="filter-group">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search hospital or blood group..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="urgency-filter"
            >
              <option value="all">All Urgency Levels</option>
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="type-filter"
            >
              <option value="all">All Types</option>
              {allTypes.map(type => (
                <option key={type} value={type.toLowerCase()}>{type}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="type-filter"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="resolved">Completed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="alerts-table-wrapper">
        {confirmationMsg && (
          <div style={{ color: '#218838', fontWeight: 600, marginBottom: 12, fontSize: '1.1rem', textAlign: 'center' }}>
            {confirmationMsg}
          </div>
        )}
        <table className="alerts-table" cellPadding="8" cellSpacing="0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Hospital Name</th>
              <th>Blood Group</th>
              <th>Type</th>
              <th>Units</th>
              <th>Urgency</th>
              <th>Status</th>
              <th>Complete Task</th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.map((alert, idx) => (
              <tr key={idx}>
                <td>{formatDate(alert.date)}</td>
                <td>{formatTime(alert.time)}</td>
                <td>{alert.hospital_name}</td>
                <td>{alert.blood_group}</td>
                <td>{alert.component}</td>
                <td>{alert.units_needed}</td>
                <td>
                  <span className={`urgency-badge ${getUrgencyClass(alert.urgency)}`}>
                    {alert.urgency}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${(alert.status || '').toLowerCase()}`}>
                    {alert.status}
                  </span>
                </td>
                <td>
                  {alert.status === "Resolved" ? (
                    <span style={{ color: '#218838', fontWeight: 600 }}>Completed</span>
                  ) : (
                    <button
                      style={{
                        background: '#e52d27',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '7px 16px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '1rem',
                        transition: 'background 0.2s',
                      }}
                      onClick={() => handleCompleteTask(alert, idx)}
                    >
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncomingAlerts;