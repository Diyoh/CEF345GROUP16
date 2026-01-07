# BuildRight - Public Infrastructure Monitoring Platform

**BuildRight** is a smart and intuitive application designed to help students, professionals, and citizens manage and monitor public infrastructure projects. It facilitates transparency and efficiency by allowing users to record transactions, view project progress, and report issues.

## 📋 Table of Contents

- [About the Project](#about-the-project)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Database Setup](#2-database-setup)
  - [3. Backend Setup](#3-backend-setup)
  - [4. Frontend Setup](#4-frontend-setup)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)

---

## 🧐 About the Project

This platform incorporates three main roles:

- **Public Citizens**: View projects, filter by region/status, and report issues.
- **Contractors**: Update project status, progress, and financial records.
- **Administrators**: Create projects, manage users, and view global analytics.

**Technologies Used:**

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express, MySQL2
- **Database**: MySQL

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed on your machine:

1.  **Node.js** (v18+ recommended) - [Download Here](https://nodejs.org/)
2.  **MySQL Server** - [Download Here](https://dev.mysql.com/downloads/installer/)
3.  **Git** - [Download Here](https://git-scm.com/)

---

## 🚀 Getting Started

Follow these steps to get the project up and running locally.

### 1. Clone the Repository

Open your terminal or command prompt and run:

```bash
git clone <repository-url>
cd CEF345GROUP16
```

### 2. Database Setup

1.  Open your MySQL Workbench or Command Line.
2.  Create the database and tables by running the script located in `Database/schema.sql`.
    - **MySQL Workbench**: Open `Database/schema.sql` and click the lightning bolt icon to execute.
    - **Command Line**:
      `bash
    mysql -u root -p < Database/schema.sql
    `
      _(Note: Ensure the script creates a database named `buildright`. If not, create it manually first: `CREATE DATABASE buildright;`)_

### 3. Backend Setup

The backend handles the API and database communication.

1.  Navigate to the **Backend** directory:

    ```bash
    cd Backend
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Configure Environment Variables:

    - Create a file named `.env` in the `Backend` directory.
    - Copy the contents from `.env.example` (if available) or use the following template:
      ```env
      PORT=5000
      DB_HOST=localhost
      DB_USER=root
      DB_PASS=your_mysql_password
      DB_NAME=buildright
      JWT_SECRET=supersecretkey123
      ```
    - **Important**: Replace `your_mysql_password` with your actual MySQL root password.

4.  Seed the Database (Optional but Recommended):

    - Populate the database with initial mock data:
      ```bash
      npm run seed
      ```

5.  Start the Backend Server:
    ```bash
    npm run dev
    ```
    - The server should start on `http://localhost:5000`.

### 4. Frontend Setup

The frontend is the user interface of the application.

1.  Open a **new** terminal window (keep the backend running) and navigate to the **Frontend** directory:

    ```bash
    cd Frontend
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Start the Frontend Application:
    ```bash
    npm run dev
    ```
    - The application will launch automatically in your browser, usually at `http://localhost:5173`.

---

## 📂 Project Structure

```text
CEF345GROUP16/
├── Backend/            # Node.js & Express API
│   ├── config/         # Database configuration
│   ├── controllers/    # Logic for handling requests
│   ├── routes/         # API endpoints
│   └── ...
├── Database/           # SQL scripts and schema
│   └── schema.sql      # Main database creation script
├── Documents/          # Project documentation & reports
├── Frontend/           # React application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Application pages
│   │   └── ...
└── README.md           # This file
```

## 📚 Documentation

For more detailed information about specific parts of the project, refer to the documentation in the `Documents` folder or the specific READMEs:

- [Backend README](./Backend/README.md)
- [Frontend README](./Frontend/README.md)

## 🔧 Troubleshooting

- **Database Connection Error**: Double-check your `.env` file in the `Backend` folder. Ensure the `DB_PASS` is correct and the MySQL server is running.
- **Port in Use**: If port 5000 or 5173 is busy, close the other application or change the port in `.env` (Backend) or `vite.config.js` (Frontend).
- **"Table doesn't exist"**: Make sure you ran the `Database/schema.sql` script before starting the backend.
