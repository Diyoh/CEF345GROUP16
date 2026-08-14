# Final Project Presentation: BuildRight Cameroon

**Project Title**: BuildRight Cameroon - Infrastructure Monitoring Platform  
**Course Code**: CEF345  
**Course Title**: Software Development Tools  
**Group**: 16  
**Date**: February 6, 2026

**Team Members**:

- Asobo Joyce
- Diyoh Shiloh
- Ashu Fidelis
- Tendongfor Nick
- Soh Marrious

---

## 1. Project Overview & Objectives

**BuildRight Cameroon** is an engineering solution aimed at digitalizing the monitoring of public infrastructure projects. It addresses the lack of transparency and real-time data in the construction sector.

### Core Objectives

1.  **Transparency**: Public access to project budgets, timelines, and status.
2.  **Accountability**: Immutable audit trails for contractor updates and government approvals.
3.  **Real-Time Monitoring**: Live tracking of construction progress using WebSocket technology.

---

## 2. Technical Architecture

We implemented a **Tiered Architecture** to ensure separation of concerns, scalability, and maintainability.

### 2.1 Technology Stack

| Layer          | Technology        | Justification                                                   |
| :------------- | :---------------- | :-------------------------------------------------------------- |
| **Frontend**   | React (Vite)      | Component-based UI, fast rendering with Virtual DOM.            |
| **Backend**    | Node.js + Express | Non-blocking I/O for handling concurrent API requests.          |
| **Database**   | MySQL             | ACID-compliant relational database for structured project data. |
| **Real-Time**  | Socket.io         | Bi-directional communication for live progress updates.         |
| **Deployment** | Docker            | Containerization for consistent environments across dev/prod.   |

### 2.2 Database Design (MySQL)

Our database schema is designed to enforce data integrity. Key entities include:

- **Users**: Stores credentials (hashed with `bcryptjs`) and Role-Based Access Control (RBAC) flags (`admin`, `contractor`, `developer`).
- **Projects**: Central table linking specific infrastructure sites to contractors.
- **Updates**: Time-stamped progress logs, linked to Projects.
- **Contractors**: Extended profile data for construction firms.

_We used functionality like Foreign Keys for referential integrity and Indexes on frequently queried fields (e.g., `project_id`)._

---

## 3. Development Process (SDLC)

We adopted an **Agile/Iterative** development lifecycle, ensuring continuous feedback and rapid delivery of features.

### Stage 1: Requirements & Design

- **UML Modeling**: Created Use Case diagrams to define actor interactions (Public vs. Admin).
- **Schema Design**: Normalized the database to 3NF to reduce redundancy.

### Stage 2: Implementation

- **API Development**: Built RESTful endpoints (GET, POST, PUT, DELETE) using Express.
- **Middleware**: Implemented `cors` for cross-origin security, `helmet` for HTTP header hardening, and `express-rate-limit` to prevent DDoS.
- **Authentication**: Stateless authentication using **JSON Web Tokens (JWT)**.

### Stage 3: Testing Strategy

Quality Assurance was integral to our workflow:

- **Unit Testing**: Used **Jest** for backend logic validation (e.g., input validation functions).
- **Frontend Testing**: Used **Vitest** for component rendering tests.
- **CI/CD Pipeline**: Configured **GitHub Actions** (`test.yml`) to automatically run `npm test` on every push to `main`, ensuring no breaking changes were deployed.

### Stage 4: Deployment

- **Dockerization**: Created multi-stage `Dockerfile`s for optimized image sizes.
- **Orchestration**: Used `docker-compose.yml` to spin up Frontend, Backend, and MySQL services simultaneously with networked communication.

---

## 4. Key Engineering Challenges

### 4.1 Real-Time Synchronization

_Problem_: Ensuring all connected clients (Admin dashboard, Public map) receive progress updates instantly without polling.
_Solution_: Implemented **Socket.io**. When a contractor POSTs an update, the server emits a `project_updated` event to the specific room ID of that project.

### 4.2 Database Connectivity in Containers

_Problem_: The Node.js application attempting to connect to MySQL before the database service was fully ready.
_Solution_: Implemented a "wait-for-it" strategy (or retry logic) in the backend startup script and ensuring correct `depends_on` configuration in Docker Compose.

### 4.3 Secure Authentication

_Problem_: Protecting sensitive government data.
_Solution_: Implemented strict password hashing using `bcryptjs` (salt rounds: 10) and enforced strict JWT expiration policies.

---

## 5. Lessons Learned

1.  **Infrastructure as Code**: The value of defining our environment via Docker Compose cannot be overstated; it eliminated cross-platform compatibility issues between Windows and Linux team members.
2.  **Asynchronous Programming**: Deepened implementation of `async/await` patterns in Node.js to handle database queries without blocking the event loop.
3.  **CI/CD Importance**: Automated testing saved us from merging broken code multiple times during the final sprint.

---

## 6. Conclusion & Future Work

BuildRight Cameroon successfully demonstrates a modern, full-stack approach to infrastructure monitoring. The system is live, tested, and ready for further scaling.

**Future Enhancements**:

- Integration with GIS/Leaflet for advanced mapping.
- Mobile Application (React Native) for field contractors.

---
