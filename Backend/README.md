# BuildRight Backend API

## Overview

The Backend serves as the logic layer and data interface for the BuildRight platform. Built with **Node.js** and **Express**, it processes requests, handles authentication, and interacts with the MySQL database.

## Technologies Used

- **Node.js & Express**: Web server framework.
- **MySQL2**: Database driver for MySQL/MariaDB.
- **JSON Web Token (JWT)**: For secure, stateless user authentication.
- **Bcrypt.js**: For password hashing.
- **Multer/FS**: For handling file uploads (Base64 decoding).

## Directory Structure

```
Backend/
├── config/             # Database connection configuration
├── controllers/        # Request handling logic
├── middleware/         # Auth protection and input validation
├── routes/             # API route definitions
├── utils/              # Helper functions (e.g., file saving)
├── public/uploads/     # Storage for uploaded images
├── index.js            # Server entry point
└── seed.js             # Database population script
```

## Setup & Configuration

### 1. Environment Variables

Create a `.env` file in this directory with your database credentials:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=buildright
JWT_SECRET=your_secret_key
```

### 2. Database Initialization

Ensure you have run the `Database/schema.sql` script in your MySQL interface to create the tables.

### 3. Seeding Data

To populate the database with initial mock data:

```bash
npm run seed
```

### 4. Running the Server

- **Development Mode** (auto-restart):
  ```bash
  npm run dev
  ```
- **Production Start**:
  ```bash
  npm start
  ```
  Server runs on `http://localhost:5000`.
