// src/App.js
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import DonationHistory from './components/Dashboard/History/DonationHistory';
import Profile from './components/Dashboard/Profile/Profile';
import Header from './components/Common/Header';
import Chatbot from './components/Chatbot/Chatbot';


// Dummy user for demonstration
const user = {
  name: 'Test User',
  email: 'test@example.com',
  bloodType: 'O+',
  totalDonations: 4,
  lastDonation: '13-05-2023',
  profileImage: '',
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  console.log("App is rendering! isLoggedIn:", isLoggedIn);

  const handleLogin = (userData) => {
    console.log("Login successful:", userData);
    setCurrentUser(userData);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Only show header when logged in
  return (
    <div className="app">
      {isLoggedIn && (
        <Header 
          user={currentUser} 
          onLogout={handleLogout}
          toggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
      )}
      
      <main className={`main-content ${isLoggedIn ? 'with-header' : ''}`}>
        <Routes>
          <Route 
            path="/" 
            element={
              isLoggedIn ? (
                <Dashboard 
                  user={currentUser} 
                  onLogout={handleLogout}
                  sidebarOpen={sidebarOpen}
                  toggleSidebar={toggleSidebar}
                />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />
          <Route 
            path="/donation-history" 
            element={
              isLoggedIn ? (
                <DonationHistory 
                  user={currentUser}
                  sidebarOpen={sidebarOpen}
                />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />
          <Route 
            path="/profile" 
            element={
              isLoggedIn ? (
                <Profile 
                  user={currentUser}
                  sidebarOpen={sidebarOpen}
                />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />
          <Route
            path="/chatbox"
            element={
              isLoggedIn ? (
                <Chatbot user={currentUser} />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;