# VitaDrop

VitaDrop is a modern blood donation management platform that connects donors, hospitals, and blood banks to ensure life-saving blood is available when and where it's needed most.  
It includes:
- **Main Page** – connects the Hospital Dashboard, Blood Bank Dashboard, and Donor Dashboard, plus an **About Page** and **Educational Page** about blood donation.
- **Donor Dashboard** – connects Donors, Blood Banks, and Hospitals for efficient blood donation coordination.

---

## Getting Started

### Prerequisites
- **Node.js** (v14 or above recommended)
- **npm** (comes with Node.js)
- **Python** (v3.8 or above recommended)
- **Flask** (Python package)

---

## Installation
1. **Clone the repository**
    ```sh
    git clone <>
    ```
2. **Navigate to the project directory**
    ```sh
    cd donar_web
    ```
3. **Install frontend dependencies**
    ```sh
    npm install
    ```

---

## Running the Applications

⚠ **Important:** The backends must be started **before** running the frontends.

### Step 1 – Start Backends
1. **Python Flask Backend** (PowerShell):
    ```sh
    cd backend
    python app.py
    ```
2. **Node.js Backend** (Bash):
    ```sh
    node server.js
    
### Step 2 – Start Frontend

3. **React.js Frontend** (PowerShell):
    ```sh
    cd donar_web
    npm start
