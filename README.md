# VitaDrop

VitaDrop is a modern hospital management platform that connects donors, blood banks to ensure life-saving blood is available when and where it's needed most.  

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
    git clone <https://github.com/vk0108/VitaDrop.git>
    ```
2. **Navigate to the project directory**
    ```sh
    cd hospital
    ```
3. **Install frontend dependencies**
    ```sh
    npm install
    ```

---

## Update code at line 465 to 467 in app.py
- use your own mail id and app password at those lines.

## Running the Applications

⚠ **Important:** The backends must be started **before** running the frontends.

### Step 1 – Start Backends
1. **Python Flask Backend** (PowerShell):
    ```sh
    cd backend
    python app.py
    ```

   2.**Frontend** (Bash):
    ```sh
       cd hospital
       PORT=3004 npm start



