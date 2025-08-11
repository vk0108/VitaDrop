import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Hospital Alerts", path: "/incoming-alerts" },
  { label: "Inventory Management", path: "/inventory" },
  { label: "Alert Donors", path: "/donor-alert-map" },
  { label: "Analytics Dashboard", path: "/analytics" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="navbar-container">
      <div className="navbar-logo" onClick={() => navigate("/dashboard")}>
        🩸 <span>VitaDrop</span>
      </div>
      <div className="navbar-links">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`nav-btn${location.pathname === item.path ? " active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Navbar;
