import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import "./Chatbot.css";

const Chatbot = ({ user, requestSource, onStoreEligibilityResponse }) => {
  const [messages, setMessages] = useState([
    {
      id: "1",
      sender: "bot",
      text: "Hello Test User! 👋 I'm your Blood Donation Eligibility AI Assistant. Shall we begin?"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(null);
  const [eligibilityData, setEligibilityData] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [eligibilityTerminated, setEligibilityTerminated] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const addMessage = (sender, text) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sender, text }
    ]);
  };

  const terminateEligibility = async (reason) => {
    setEligibilityTerminated(true);
    setWaitingForInput(null);
    addMessage("bot", `❌ **You are not eligible to donate blood.**\n\n**Reason:** ${reason}\n\nFor your safety and the safety of recipients, please wait until you meet the eligibility criteria before attempting to donate.`);
    // Store in backend as not eligible
  const donor_id = user?.donor_id || localStorage.getItem('donor_id');
    if (donor_id && typeof onStoreEligibilityResponse === 'function') {
      await onStoreEligibilityResponse({ eligible: 'no' });
    }
  };

  const checkEligibility = () => {
    setEligibilityData({});
    setEligibilityTerminated(false);
    setWaitingForInput("age");
    addMessage("bot", "Let's check your eligibility for blood donation. First, how old are you?");
  };

  const handleEligibilityInput = async (value) => {
    if (waitingForInput === "age") {
      const age = parseInt(value);
      if (isNaN(age) || age <= 0) {
        addMessage("bot", "Please enter a valid age:");
        return;
      }
      
      addMessage("user", `${age} years old`);
      
      if (age < 18) {
        terminateEligibility("You must be at least 18 years old to donate blood.");
        return;
      } else if (age > 65) {
        terminateEligibility("Blood donation is typically not recommended for individuals over 65 years of age.");
        return;
      }
      
      setEligibilityData(prev => ({ ...prev, age }));
      setWaitingForInput("weight");
      addMessage("bot", "What is your current weight in kilograms?");
      
    } else if (waitingForInput === "weight") {
      const weight = parseFloat(value);
      if (isNaN(weight) || weight <= 0) {
        addMessage("bot", "Please enter a valid weight in kg:");
        return;
      }
      
      addMessage("user", `${weight} kg`);
      
      if (weight < 50) {
        terminateEligibility("You must weigh at least 50 kg to safely donate blood.");
        return;
      }
      
      setEligibilityData(prev => ({ ...prev, weight }));
      setWaitingForInput("chronic_illness");
      addMessage("bot", "Do you have any chronic illnesses like heart disease, diabetes, or epilepsy? (Please answer with 'yes' or 'no')");
      
    } else if (waitingForInput === "chronic_illness") {
      const answer = value.toLowerCase().trim();
      addMessage("user", value);
      
      if (answer === "yes" || answer === "y") {
        terminateEligibility("Individuals with chronic illnesses such as heart disease, diabetes, or epilepsy are not eligible to donate blood for safety reasons.");
        return;
      } else if (answer !== "no" && answer !== "n") {
        addMessage("bot", "Please answer with 'yes' or 'no': Do you have any chronic illnesses like heart disease, diabetes, or epilepsy?");
        return;
      }
      
      setEligibilityData(prev => ({ ...prev, chronic_illness: false }));
      setWaitingForInput("blood_diseases");
      addMessage("bot", "Do you have or have you ever had hepatitis, HIV/AIDS, or any other blood-borne diseases? (Please answer with 'yes' or 'no')");
      
    } else if (waitingForInput === "blood_diseases") {
      const answer = value.toLowerCase().trim();
      addMessage("user", value);
      
      if (answer === "yes" || answer === "y") {
        terminateEligibility("Individuals with hepatitis, HIV/AIDS, or other blood-borne diseases cannot donate blood to protect recipient safety.");
        return;
      } else if (answer !== "no" && answer !== "n") {
        addMessage("bot", "Please answer with 'yes' or 'no': Do you have or have you ever had hepatitis, HIV/AIDS, or any other blood-borne diseases?");
        return;
      }
      
      setEligibilityData(prev => ({ ...prev, blood_diseases: false }));
      setWaitingForInput("recent_illness");
      addMessage("bot", "Have you been feeling unwell (fever, cold, cough, flu) in the past 7 days? (Please answer with 'yes' or 'no')");
      
    } else if (waitingForInput === "recent_illness") {
      const answer = value.toLowerCase().trim();
      addMessage("user", value);
      
      if (answer === "yes" || answer === "y") {
        terminateEligibility("You must be in good health without any recent illness symptoms to donate blood. Please wait until you've been symptom-free for at least 7 days.");
        return;
      } else if (answer !== "no" && answer !== "n") {
        addMessage("bot", "Please answer with 'yes' or 'no': Have you been feeling unwell (fever, cold, cough, flu) in the past 7 days?");
        return;
      }
      
      setEligibilityData(prev => ({ ...prev, recent_illness: false }));
      setWaitingForInput("infections");
      addMessage("bot", "Have you had any recent infections or skin conditions near where the needle would be placed? (Please answer with 'yes' or 'no')");
      
    } else if (waitingForInput === "infections") {
      const answer = value.toLowerCase().trim();
      addMessage("user", value);
      
      if (answer === "yes" || answer === "y") {
        terminateEligibility("Active infections or skin conditions near the donation site make blood donation unsafe. Please wait until fully healed.");
        return;
      } else if (answer !== "no" && answer !== "n") {
        addMessage("bot", "Please answer with 'yes' or 'no': Have you had any recent infections or skin conditions near where the needle would be placed?");
        return;
      }
      
      setEligibilityData(prev => ({ ...prev, infections: false }));
      setWaitingForInput("last_donation");
      addMessage("bot", "When was the last time you donated blood? (Enter the number of days ago, or '0' if you've never donated)");
      
    } else if (waitingForInput === "last_donation") {
      const days = parseInt(value);
      if (isNaN(days) || days < 0) {
        addMessage("bot", "Please enter a valid number of days since your last donation (or '0' if you've never donated):");
        return;
      }
      
      addMessage("user", days === 0 ? "Never donated before" : `${days} days ago`);
      
      if (days > 0 && days < 56) {
        terminateEligibility("You must wait at least 56 days (8 weeks) between blood donations for your body to replenish.");
        return;
      }
      
      setEligibilityData(prev => ({ ...prev, last_donation: days }));
      setWaitingForInput("pregnancy");
      addMessage("bot", "Are you currently pregnant or have you been pregnant in the last 6 months? (Please answer with 'yes' or 'no')");
      
    } else if (waitingForInput === "pregnancy") {
      const answer = value.toLowerCase().trim();
      addMessage("user", value);
      
      if (answer === "yes" || answer === "y") {
        terminateEligibility("Pregnant individuals or those who have been pregnant within the last 6 months cannot donate blood for health and safety reasons.");
        return;
      } else if (answer !== "no" && answer !== "n") {
        addMessage("bot", "Please answer with 'yes' or 'no': Are you currently pregnant or have you been pregnant in the last 6 months?");
        return;
      }
      
      setEligibilityData(prev => ({ ...prev, pregnancy: false }));
      setWaitingForInput("alcohol");
      addMessage("bot", "Do you consume alcohol regularly? (Please answer with 'yes' or 'no')");
      
    } else if (waitingForInput === "alcohol") {
      const answer = value.toLowerCase().trim();
      addMessage("user", value);
      
      if (answer !== "yes" && answer !== "y" && answer !== "no" && answer !== "n") {
        addMessage("bot", "Please answer with 'yes' or 'no': Do you consume alcohol regularly?");
        return;
      }
      
      const alcoholUser = (answer === "yes" || answer === "y");
      setEligibilityData(prev => ({ ...prev, alcohol: alcoholUser }));
      setWaitingForInput(null);
      
      // All questions passed - user is eligible
      const finalMessage = alcoholUser 
        ? "✅ **You are eligible to donate blood!**\n\nSince you consume alcohol regularly, please avoid drinking alcohol for 24 hours before your donation appointment.\n\nYou will soon receive an email for confirmation. Once you get the email, you can proceed with the donation process."
        : "✅ **You are eligible to donate blood!**\n\nYou will soon receive an email for confirmation. Once you get the email, you can proceed with the donation process.";
      addMessage("bot", finalMessage);
      // Store in backend as eligible
  const donor_id = user?.donor_id || localStorage.getItem('donor_id');
      if (donor_id && typeof onStoreEligibilityResponse === 'function') {
        await onStoreEligibilityResponse({ eligible: 'yes' });
      }
    }
  };

  const fetchTips = async (type) => {
    setLoading(true);
    try {
      let endpoint = "";
      if (type === "preparation") {
        endpoint = "/api/preparation-tips";
      } else if (type === "post") {
        endpoint = "/api/post-care";
      } else {
        throw new Error("Invalid tip type");
      }

      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      addMessage("bot", data.reply || "Sorry, I couldn't fetch tips.");
    } catch (err) {
      console.error(err);
      addMessage("bot", `❌ Failed to fetch ${type} tips.`);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (option) => {
    if (waitingForInput) return;
    
    addMessage("user", option);
    if (option === "Start Eligibility Check") {
      checkEligibility();
    } else if (option === "Preparation Tips") {
      fetchTips("preparation");
    } else if (option === "Post-Donation Care") {
      fetchTips("post");
    }
  };

  const handleInputSubmit = async () => {
    const value = inputValue.trim();
    if (!value) return;
    
    if (waitingForInput) {
      handleEligibilityInput(value);
    } else {
      // Handle general chat input
      addMessage("user", value);
      setLoading(true);

      try {
        // Prepare conversation history for context (last 10 messages)
        const chatHistory = messages
          .slice(-10)
          .map(msg => ({
            role: msg.sender === "bot" ? "assistant" : "user",
            content: msg.text
          }))
          .concat([{ role: "user", content: value }]);

        const res = await fetch("http://localhost:5001/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatHistory })
        });
        const data = await res.json();
        const aiReply =
          data.choices?.[0]?.message?.content ||
          data.choices?.[0]?.text ||
          "Sorry, I couldn't find an answer to your question.";
        addMessage("bot", aiReply);
      } catch (err) {
        addMessage("bot", "❌ Sorry, I couldn't contact the AI service.");
      }
      setLoading(false);
    }
    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    }
  };

  const getPlaceholder = () => {
    if (waitingForInput === "age") return "Enter your age...";
    if (waitingForInput === "weight") return "Enter your weight in kg...";
    if (waitingForInput === "chronic_illness") return "Answer yes or no...";
    if (waitingForInput === "blood_diseases") return "Answer yes or no...";
    if (waitingForInput === "recent_illness") return "Answer yes or no...";
    if (waitingForInput === "infections") return "Answer yes or no...";
    if (waitingForInput === "last_donation") return "Enter days since last donation...";
    if (waitingForInput === "pregnancy") return "Answer yes or no...";
    if (waitingForInput === "alcohol") return "Answer yes or no...";
    return "Type your message...";
  };

  return (
    <div className="chatbot-page">
      {/* Animated background elements for consistency */}
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
      {/* Center the chatbot container */}
      <div className="chatbot-content-container">
        <div className="chatbot-container">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="bot-avatar">
                🤖
              </div>
              <div className="chatbot-info">
                <h3>BloodLink Assistant</h3>
                <p className="status">Online</p>
              </div>
            </div>
            <button className="close-button">×</button>
          </div>
          {/* Menu Buttons - Moved to top */}
          <div className="chatbot-menu-top">
            <button 
              onClick={() => handleMenuClick("Start Eligibility Check")}
              disabled={waitingForInput}
              className="menu-button primary"
            >
              Start Eligibility Check
            </button>
            <div className="menu-row">
              <button 
                onClick={() => handleMenuClick("Preparation Tips")}
                disabled={waitingForInput}
                className="menu-button secondary"
              >
                Preparation Tips
              </button>
              <button 
                onClick={() => handleMenuClick("Post-Donation Care")}
                disabled={waitingForInput}
                className="menu-button secondary"
              >
                Post-Donation Care
              </button>
            </div>
          </div>
          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                <div className="message-content">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message bot">
                <div className="message-content">⏳ Loading...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Input - Always visible */}
          <div className="chatbot-input">
            <div className="input-container">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={getPlaceholder()}
                className="input-field"
              />
              <button onClick={handleInputSubmit} className="send-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
            <p className="input-hint">Press Enter to send</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;