# BuildRight Frontend

## Overview

This is the client-side application for the BuildRight Public Infrastructure Monitoring Platform. It is built with **React** and **Vite**, offering a modern, responsive interface for three distinct user groups: Public Citizens, Contractors, and Administrators.

## Technologies Used

- **React 18**: Component-based UI library.
- **Vite**: Next-generation frontend tooling for fast builds.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **React Router DOM**: For client-side routing.
- **Recharts**: For data visualization (financial charts).
- **Context API**: For global state management (`store.jsx`).

## Directory Structure

```
Frontend/
├── components/         # Reusable UI components (Navbar, Cards, Modals)
│   └── dashboard/      # Dashboard-specific components (tables, charts)
├── pages/              # Main route pages (Home, Login, ProjectDetails)
├── utils/              # Helper functions (currency formatting, file conversion)
├── App.jsx             # Main application component & routes
├── store.jsx           # Global State Management & API integration
├── api.js              # Centralized API service for backend communication
└── vite.config.js      # Vite configuration
```

## Setup & Running

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    The application will launch at `http://localhost:5173`.

## Key Features

- **Public Portal**: View projects, filter by region/status, report issues via comments/photos.
- **Contractor Dashboard**: Update assigned project status, progress, and spend; upload timeline updates.
- **Admin Dashboard**: Create projects, manage users, moderate comments, and view global analytics.
