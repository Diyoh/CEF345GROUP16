# Week 7: Backend Development with Node.js & Express

## Group 16 - BuildRight Infrastructure Monitoring Platform

---

### 1. Introduction to Node.js and Express

For the backend of the **BuildRight** application, we utilized **Node.js**, a powerful JavaScript runtime environment, and **Express.js**, a flexible web application framework.

- **Node.js**: Allows us to use JavaScript on the server-side, unified with our frontend language. It provides non-blocking, event-driven architecture suitable for scalable applications.
- **Express.js**: Simplifies the process of building the backend by providing robust routing and middleware features. It serves as the foundation for our REST API.

### 2. Developing the Simple Backend

We initialized our project using `npm init` and installed key dependencies such as `express`, `cors`, `dotenv`, and `mysql2`.

**Entry Point (`index.js`):**
Our server entry point is configured to:

- Load environment variables using `dotenv`.
- Enable **CORS** (Cross-Origin Resource Sharing) to allow our Frontend to communicate with the Backend.
- Implement security headers using `helmet` and rate limiting with `express-rate-limit`.
- Parse incoming JSON requests and Cookies.
- Serve static files (uploaded images) from the `public/uploads` directory.

### 3. REST API Structure

We designed a structured **REST API** to handle client requests. The API is versioned (v1) and organized into modular routes:

- **Base URL**: `/api/v1`
- **Key Endpoints**:
  - `/auth`: User registration and login (Authentication).
  - `/projects`: CRUD operations for construction projects.
  - `/team`: Managing team members and contractors.
  - `/admin`: Administrative tasks and user management.
  - `/stats`: efficient retrieval of dashboard statistics.
  - This modular approach ensures code maintainability and separation of concerns.

### 4. Database Integration (MySQL)

We successfully connected our API to the MySQL database created in Week 6.

**Configuration (`config/db.js`):**

- We used the `mysql2/promise` library to support `async/await` syntax for cleaner code.
- **Connection Pool**: Instead of a single connection, we implemented a **Connection Pool**. This improves performance by maintaining multiple reusable connections, automatically handling re-connections and parallel queries.
- **Type Casting**: Custom casting was added to ensure MySQL `DECIMAL` types are correctly read as JavaScript numbers.

### 5. User Authentication & Database Queries

**Authentication:**

- We implemented secure user authentication using **JWT (JSON Web Tokens)**.
- Passwords are hashed using `bcryptjs` before being stored in the database, ensuring security best practices.
- Protected routes use middleware to verify the JWT before granting access.

**Database Queries:**

- Our controllers use SQL queries to interact with the database.
- Example: Fetching detailed project info, inserting new contractor records, and validating user credentials during login.
- We used parameterized queries to prevent **SQL Injection** attacks.

### 6. Backend-Frontend Integration

The backend exposes port `5000` (by default) which the frontend consumes.

- **Data Flow**: The frontend sends HTTP requests (GET, POST, PUT, DELETE) to our API endpoints.
- **Response**: The backend processes the request, queries the MySQL database, and returns a JSON response containing the requested data or execution status.
- **Real-time Updates**: We also integrated `Socket.io` to enable real-time communication between the server and the client.

### 7. Conclusion

In Week 7, Group 16 successfully built a robust, secure, and scalable backend backbone for the BuildRight platform. We have established a working REST API that fully integrates with our MySQL database and supports our frontend application.
