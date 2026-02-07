# BuildRight Platform: A Detailed Development Guide & Learning Resource

**Version**: 1.0
**Target Audience**: Students, Junior Developers, and Learners.

---

## 1. Introduction

This document serves as a complete blueprint of how the **BuildRight Public Infrastructure Monitoring Platform** was architected and developed. It is designed to take you from a blank screen to a fully functional Full-Stack Application.

### The Problem

We needed a system to allow:

1.  **Citizens** to view and report on public construction projects.
2.  **Contractors** to update their progress.
3.  **Admins** to oversee the entire system.

### The Solution: "Full Stack" Architecture

We built a **Three-Tier Architecture**:

1.  **Frontend (The View)**: A React-based website that users interact with.
2.  **Backend (The Logic)**: A Node.js server that processes data and security.
3.  **Database (The Storage)**: A MySQL database that keeps data permanent.

---

## 2. Tools & Technologies (The "Stack")

We used the **PERN/MERN** stack philosophy (Postgres/MySQL, Express, React, Node).

### A. Frontend (Client-Side)

- **React (via Vite)**:
  - _Why?_ It allows us to build a dynamic "Single Page Application" (SPA) where the page never reloads, it just updates content instantly.
  - _Tooling_: We used `Vite` instead of `create-react-app` because it is much faster to start and build.
- **Tailwind CSS**:
  - _Why?_ Instead of writing separate CSS files, we use utility classes (like `bg-red-500`, `p-4`) directly in our HTML/JSX. It speeds up styling massively.
- **React Router**:
  - _Why?_ Handles navigation (e.g., going from `/login` to `/dashboard`) without refreshing the browser.

### B. Backend (Server-Side)

- **Node.js**:
  - _Why?_ Allows us to write the server code in JavaScript, the same language as the frontend.
- **Express.js**:
  - _Why?_ A framework that simplifies creating API Endpoints (URLs like `GET /projects`) and handling HTTP requests.
- **JSON Web Tokens (JWT)**:
  - _Why?_ For security. When a user logs in, we give them a digital "badge" (token). They show this badge for every request to prove who they are.

### C. Database

- **MySQL**:
  - _Why?_ A Relational Database. We use it because our data has strict relationships (e.g., A **Project** _has many_ **Comments**, A **Contractor** _owns_ a **Project**).

---

## 3. Communication Flow (How it works together)

Imagine a user clicks "Login". Here is the journey:

1.  **Browser (Frontend)**: User types email/password and clicks Submit.
    - Code: `api.login(email, password)` in `Frontend/api.js`.
2.  **Network**: The request travels to `http://localhost:5000/api/v1/auth/login`.
3.  **Server (Backend)**: Express receives the POST request.
    - Code: `authRoutes.js` sends it to `authController.js`.
4.  **Logic**:
    - The Controller asks the Database: "Do we have a user with this email?"
    - The Controller checks: "Does the password match the hash?"
5.  **Response**:
    - If correct, the Server creates a **JWT Token** and sends it back as JSON.
6.  **Browser (Frontend)**:
    - Receives the token.
    - Saves it in `localStorage` (browser memory).
    - Updates the `store.jsx` state to show the user as "Logged In".
    - Redirects to the Dashboard.

---

## 4. Step-by-Step Development Process

If you were to build this from scratch, follow these steps:

### Phase 1: Planning & Database (The Foundation)

1.  **Define Entities**: We listed what we need: Users, Projects, Comments.
2.  **Design Schema**: We decided on the table columns and relationships.
    - _Look at_: `Database/schema.sql`.
    - _Key Concept_: **Foreign Keys** link tables together (e.g., `contractor_id` in the `projects` table points to `id` in the `users` table).

### Phase 2: The Backend (The Engine)

1.  **Initialize**: `npm init -y` to create `package.json`.
2.  **Dependencies**: Installed `express`, `mysql2`, `cors`, `dotenv`.
3.  **Server Entry**: Created `index.js` to start the server.
4.  **Database Connection**: Created `config/db.js` to connect to MySQL.
5.  **Routes & Controllers**:
    - We grouped features by "Resource" (Auth, Projects, Team).
    - For each resource, we made a **Route** file (defining the URLs) and a **Controller** file (defining the content).
6.  **Testing**: We used tools like Postman (or Thunder Client) to test `GET /projects` before we even had a frontend.

### Phase 3: The Frontend (The Interface)

1.  **Scaffold**: `npm create vite@latest` to make the React app.
2.  **Styling**: Installed Tailwind CSS.
3.  **Components**: Built reusable blocks:
    - `Navbar`, `Footer`, `ProjectCard`.
4.  **Pages**: Built the full screens:
    - `Home`, `Login`, `ProjectDetails`.
5.  **State Management**:
    - Created `store.jsx` (Context API). This is the "brain" of the frontend. It holds the data so different components can share it without passing props down 10 levels.

### Phase 4: Integration (The Wiring)

1.  **API Service**: Created `api.js`. detailed functions (`getProjects`, `login`) that call `fetch()`.
2.  **Connect Store**: Updated `store.jsx` to call `api.js` instead of using fake mock data.
3.  **Environment**: Added `.env` files to store secrets (like DB passwords) so they aren't hardcoded.

---

## 5. Directory Walkthrough (Where things are)

### `Backend/`

- `index.js`: **Start here.** It shows how the server receives requests.
- `config/db.js`: Shows how we talk to MySQL.
- `middleware/authMiddleware.js`: Shows how we protect routes (Security).
- `controllers/`: The actual logic. Read `projectController.js` to see how SQL queries are written in Node.js.

### `Frontend/`

- `App.jsx`: **Start here.** It shows the Routing (Navigation).
- `store.jsx`: Shows how data moves around the app.
- `api.js`: Shows how we talk to the backend.
- `pages/`: The visual screens.

---

## 6. How to Learn from this Project

To master this stack, try the following exercises on this codebase:

1.  **Beginner**: Change the color of the "Completed" badge in `StatusBadge.jsx`.
2.  **Intermediate**: Add a new field to the database (e.g., `Project Priority`).
    - Update `schema.sql`.
    - Update `Backend/controllers/projectController.js` (create/update functions).
    - Update `Frontend/components/ProjectModal.jsx` (add an input field).
3.  **Advanced**: Implement "Delete Account".
    - Create a route in Backend.
    - Handle the logic (delete user + reassignment of their projects?).
    - Add a button in the Frontend Profile area.

---

## 7. Conclusion

This project demonstrates a production-ready structure. We separated concerns (Frontend vs Backend), used professional database practices (Normalization, Foreign Keys), and implemented secure authentication. By following the `README` files in each directory alongside this guide, you can replicate this entire system.
