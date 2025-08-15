"use client"

import { useState, useEffect, useRef } from "react"
import "./BloodBankAlertPage.css"

const center = [12.9716, 77.5946]
const API_BASE_URL = "http://127.0.0.1:5004"

const bloodProducts = ["Whole Blood", "Plasma", "Platelets", "Packed RBC", "Fresh Frozen Plasma"]

export default function BloodBankAlertPage() {
  const [bloodBanksNearby, setBloodBanksNearby] = useState([])
  const [requestStatus, setRequestStatus] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("A+")
  const [selectedProducts, setSelectedProducts] = useState(["Whole Blood"])
  const [urgencyLevel, setUrgencyLevel] = useState("High")
  const [unitsNeeded, setUnitsNeeded] = useState(1)

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
  const urgencyLevels = ["Low", "Medium", "High", "Critical"]

  // Fetch blood banks and alerts on mount
  useEffect(() => {
    fetchBloodBanks()
    fetchAndSyncAlerts()
    // Poll for status updates every 10 seconds
    const interval = setInterval(fetchAndSyncAlerts, 10000)
    return () => clearInterval(interval)
  }, [])


  // Fetch bank-hospital responses from backend and sync requestStatus
  const fetchAndSyncAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bb-responses`)
      if (response.ok) {
        const data = await response.json()
        const responses = data.responses || []
        // Map: bank_id => status (for hospital_id 99), robust to type/format mismatches
        const statusMap = {}
        responses.forEach(resp => {
          if (resp.hospital_id === "99") {
            let respBankId = resp.bank_id !== undefined && resp.bank_id !== null ? String(resp.bank_id).trim() : undefined;
            if (!respBankId || respBankId === "undefined" || respBankId === "null" || respBankId === "") {
              respBankId = resp.id !== undefined && resp.id !== null ? String(resp.id).trim() : undefined;
            }
            if (respBankId) {
              statusMap[respBankId] =
                resp.status === "ACCEPTED" ? "accepted" :
                resp.status === "SENT" ? "sent" :
                resp.status === "FAILED" ? "failed" :
                resp.status?.toLowerCase() || "not-sent";
            }
          }
        });
        setRequestStatus(statusMap)
      }
    } catch (e) {
      // Ignore errors
    }
  }

  const fetchBloodBanks = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/bloodbanks`)
      if (response.ok) {
        const data = await response.json()
        setBloodBanksNearby(data.bloodbanks || [])
  // console.log('Fetched bloodbanks:', data.bloodbanks)
        setError("")
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      setError(`Backend connection failed: ${error.message}`)
      // Fallback to CSV data
      loadFallbackData()
    } finally {
      setLoading(false)
    }
  }

  const loadFallbackData = async () => {
    try {
      const response = await fetch("/bloodbanks_data.csv")
      const csvText = await response.text()
      const lines = csvText.split("\n")
      const headers = lines[0].split(",")
      const banks = lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line, index) => {
          const values = line.split(",")
          return {
            id: values[0] || `bank_${index}`,
            bank_id: values[0] || `bank_${index}`,
            name: values[1] || `Blood Bank ${index + 1}`,
            phone: values[2] || "Phone not available",
            city: values[3] || "City",
            lat: Number.parseFloat(values[4]) || 12.9716,
            lon: Number.parseFloat(values[5]) || 77.5946,
            distance: values[6] ? `${values[6]} km` : "N/A",
            blood_types_available: values[7] || "A+,B+,O+,AB+",
          }
        })
      setBloodBanksNearby(banks)
    } catch (error) {
      console.error("Failed to load fallback data:", error)
    }
  }

  const handleProductChange = (product) => {
    setSelectedProducts((prev) => (prev.includes(product) ? prev.filter((p) => p !== product) : [...prev, product]))
  }

  const handleSendRequest = async (bankObj) => {
    // bankObj can be bank or bank id, handle both
  const bank = typeof bankObj === "object" ? bankObj : bloodBanksNearby.find(b => String(b.bank_id ?? b.id ?? "").trim() === String(bankObj).trim())
  const bankKey = String(bank.bank_id ?? bank.id ?? "").trim()
    // Only set to pending if not already sent/accepted
    if (requestStatus[bankKey] === "sent" || requestStatus[bankKey] === "accepted") {
      return;
    }
    setRequestStatus((prev) => ({ ...prev, [bankKey]: "pending" }));

    // Prepare request body as expected by backend
    const requestData = {
      hospital_name: "Shree's Hospital", // or get from user context if available
      blood_bank_name: bank.name,
      phone: bank.phone,
      distance: (bank.distance_km || bank.distance || "1.5").toString(),
      blood_group: selectedBloodGroup,
      units_needed: unitsNeeded,
      urgency: urgencyLevel,
      component: selectedProducts[0] || "Whole Blood",
      bank_id: "21"
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/request-blood`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      if (response.ok && result.status === "success") {
        fetchAndSyncAlerts();
        // Optionally, show a success message here
      } else {
        // Show backend error message if available
        const errorMsg = result && result.message ? result.message : "Request failed.";
        alert(`Error: ${errorMsg}`);
        // Only set to failed if it was pending
        setRequestStatus((prev) => ({ ...prev, [bankKey]: prev[bankKey] === "pending" ? "failed" : prev[bankKey] }));
        fetchAndSyncAlerts();
      }
    } catch (error) {
      alert(`Error: ${error.message || error}`);
      setRequestStatus((prev) => ({ ...prev, [bankKey]: prev[bankKey] === "pending" ? "failed" : prev[bankKey] }));
      fetchAndSyncAlerts();
    }
  }

  const handleSendAllRequests = () => {
    bloodBanksNearby.forEach((bank) => {
      const bankKey = String(bank.bank_id || bank.id)
      if (!requestStatus[bankKey]) {
        handleSendRequest(bank)
      }
    })
  }

  if (loading) {
    return (
      <div className="loading">
        <div>🏥 Loading nearby blood banks...</div>
        <small>Please ensure Flask backend is running on port 5000</small>
      </div>
    )
  }

  return (
    <div className="blood-bank-alert-page">
      <div className="page-header">
        <div className="header-text-group">
          <h1 className="page-title">Request Blood from Banks</h1>
          <div className="title-underline"></div>
          <p className="page-subtitle">Send urgent blood requests to nearby blood banks</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <br />
          <small>
            Using fallback data. Start backend with: <code>python backend/app.py</code>
          </small>
        </div>
      )}

      <div className="request-form-section">
        <h3>🩸 Blood Request Details</h3>
        <div className="request-form">
          <div className="form-row">
            <div className="form-group">
              <label>Blood Group:</label>
              <select
                value={selectedBloodGroup}
                onChange={(e) => setSelectedBloodGroup(e.target.value)}
                className="form-select"
              >
                {bloodGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Units Needed:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={unitsNeeded}
                onChange={(e) => setUnitsNeeded(Number.parseInt(e.target.value))}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Urgency Level:</label>
              <select value={urgencyLevel} onChange={(e) => setUrgencyLevel(e.target.value)} className="form-select">
                {urgencyLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Blood Products Needed:</label>
            <div className="products-box">
              <div className="products-grid">
                {bloodProducts.map((product) => (
                  <label key={product} className="product-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product)}
                      onChange={() => handleProductChange(product)}
                    />
                    <span>{product}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="notifications-section">
        <div className="section-header">
          <h3>Send Requests to Blood Banks</h3>
          <button className="send-all-btn" onClick={handleSendAllRequests}>
            Send All Requests
          </button>
        </div>
        <table className="notifications-table">
          <thead>
            <tr>
              <th>BLOOD BANK</th>
              <th>PHONE</th>
              <th>DISTANCE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {bloodBanksNearby.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-banks">
                  No blood banks found within 10km radius
                </td>
              </tr>
            ) : (
              bloodBanksNearby.map((bank, idx) => {
                const bankKey = String(bank.bank_id ?? bank.id ?? idx).trim()
                return (
                  <tr key={bankKey}>
                    <td>
                      <div className="bank-info">
                        <strong>{bank.name}</strong>
                      </div>
                    </td>
                    <td>{bank.phone}</td>
                    <td>{bank.distance_km ? `${bank.distance_km} km` : "N/A"}</td>
                    <td>
                      <span className={`status ${requestStatus[bankKey] || "not-sent"}`}>
                        {requestStatus[bankKey] === "pending"
                          ? "⏳ Sending..."
                          : requestStatus[bankKey] === "accepted"
                            ? "✅ Accepted"
                            : requestStatus[bankKey] === "available"
                              ? "✅ Available"
                              : requestStatus[bankKey] === "unavailable"
                                ? "❌ Unavailable"
                                : requestStatus[bankKey] === "partial"
                                  ? "⚠️ Partial"
                                  : requestStatus[bankKey] === "sent"
                                    ? "📤 Sent"
                                    : requestStatus[bankKey] === "failed"
                                      ? "⚠️ Failed"
                                      : "Not Sent"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="send-notification-btn"
                        disabled={requestStatus[bankKey] === "pending" || requestStatus[bankKey] === "sent" || requestStatus[bankKey] === "accepted"}
                        onClick={() => handleSendRequest(bank)}
                      >
                        {requestStatus[bankKey] === "accepted"
                          ? "✓ Accepted"
                          : requestStatus[bankKey] === "sent"
                            ? "✓ Sent"
                            : requestStatus[bankKey] === "pending"
                              ? "Sending..."
                              : "Send Request"}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

