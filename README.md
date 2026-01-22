# BuildRight Cameroon - Infrastructure Monitoring Platform

BuildRight is a web platform designed to promote transparency and accountability in public infrastructure projects across Cameroon. It connects Contractors, Developers (Government/Auditors), and the Public to monitor project progress, budget spending, and completion statuses.

![BuildRight Logo](https://via.placeholder.com/150)

## Features

- **Public Portal**: View all infrastructure projects on a map or list, filter by region and contractor.
- **Contractor Dashboard**: Contractors can log in to update their assigned projects (progress %, budget spent, photos).
- **Admin/Developer Dashboard**: Government officials can create projects, assign contractors, and generate access codes.
- **Real-time Updates**: Live progress tracking using WebSockets (Socket.io).
- **Security**: Role-based access control (Admin, Contractor, Developer Admin), JWT authentication, and secure password hashing.

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Node.js, Express, MySQL
- **Database**: MySQL
- **Real-time**: Socket.io

## Prerequisites

Before running the project, ensure you have:

1.  **Node.js** (v18 or higher)
2.  **MySQL Server** (running locally or remotely)
3.  **Git**

## Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/yourusername/buildright-cameroon.git
    cd buildright-cameroon
    ```

2.  **Install Backend Dependencies**:

    ```bash
    cd Backend
    npm install
    ```

3.  **Install Frontend Dependencies**:
    ```bash
    cd ../Frontend
    npm install
    ```

## Configuration

1.  **Database Setup**:
    - Create a MySQL database named `buildright` (or your preferred name).
    - Run the provided seed/schema scripts if available (or use `npm run seed` in Backend if configured).

2.  **Environment Variables**:
    - Navigate to `Backend/`
    - Create a file named `.env`
    - Copy the contents from `.env.example` and update with your credentials:
      ```env
      PORT=5000
      DB_HOST=localhost
      DB_USER=root
      DB_PASS=your_password
      DB_NAME=buildright
      JWT_SECRET=your_secure_random_string
      ```

## Running the Application

1.  **Start the Backend**:

    ```bash
    cd Backend
    npm start
    # Server will run on http://localhost:5000
    ```

2.  **Start the Frontend**:

    ```bash
    # Open a new terminal
    cd Frontend
    npm run dev
    # Client will run on http://localhost:5173
    ```

3.  **Access the App**:
    Open your browser and navigate to `http://localhost:5173`.

## Project Structure

- **/Backend**: Node.js API server
  - `/controllers`: Business logic
  - `/routes`: API endpoints
  - `/config`: Database connection
  - `/middleware`: Auth & upload handling
- **/Frontend**: React application
  - `/src/pages`: Main views
  - `/src/components`: Reusable UI components
  - `/src/store.jsx`: Global state management

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License.
