# BuildRight Cameroon - Infrastructure Monitoring Platform

BuildRight is a web platform designed to promote transparency and accountability in public infrastructure projects in Cameroon. It allows citizens to view project details, and contractors/admins to manage updates.

## Tech Stack

- **Frontend**: React (Vite), TailwindCSS
- **Backend**: Node.js, Express, Socket.io
- **Database**: MySQL

## Prerequisites

Before running the project, ensure you have the following installed:

1.  **Node.js** (v18 or higher)
2.  **MySQL Server** (local installation or cloud instance)
3.  **Git**

## Setup Instructions

### 1. Database Setup

1.  Open your MySQL Client (Workbench, Command Line, etc.).
2.  Create a new database (e.g., `buildright_db`).
3.  Run the commands in `contractors_seed.sql` (if provided) or ensure your backend handles migration (check backend `db.js` config).
    - _Note: This project currently relies on the database schema already existing. If you need the schema, check `contractors_seed.sql` for table definitions._

### 2. Backend Configuration

1.  Navigate to the `Backend` directory:
    ```bash
    cd Backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the `Backend` directory with the following variables:
    ```env
    PORT=5000
    DB_HOST=localhost
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=buildright_db
    JWT_SECRET=your_jwt_secret_key_here
    ```
4.  Start the Backend server:
    ```bash
    npm run dev
    ```
    (The server should start on `http://localhost:5000`)

### 3. Frontend Configuration

1.  Open a new terminal and navigate to the `Frontend` directory:
    ```bash
    cd Frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Frontend development server:
    ```bash
    npm run dev
    ```
    (The app should be running at `http://localhost:5173`)

## Usage

1.  Open your browser to `http://localhost:5173`.
2.  **Public User**: Browse projects, filter by region/contractor.
3.  **Login**: Use the "Login" button.
    - **Admin**: Login with admin credentials to manage all projects.
    - **Contractor**: Login to manage assigned projects and upload photos.

## Deployment Notes

- **Images**: Uploaded images are stored in `Backend/public/uploads`. This folder is ignored by Git, so production images won't be in the repo.
- **Security**: Ensure your `.env` file is **never** committed to GitHub (it is already in `.gitignore`).

---

_Created by Gemini for BuildRight Cameroon_
