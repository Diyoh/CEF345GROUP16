# Project Setup & Handoff Guide

## 1. Third-Party Requirements

To run this project on any machine, you need:

- **Node.js**: v18 or higher.
- **MySQL Server**: The database.
- **Git**: Version control.

## 2. Environment Variables

The project relies on environment variables for configuration. These are **not** committed to GitHub for security.

1.  Navigate to `Backend/`.
2.  Create a file named `.env`.
3.  Copy the content from `.env.example` into `.env`.
4.  Update the values to match your local MySQL setup:
    ```env
    DB_HOST=localhost
    DB_USER=root
    DB_PASS=your_real_mysql_password
    DB_NAME=buildright
    JWT_SECRET=some_random_secret_string
    ```

## 3. Database Setup

1.  Open your MySQL client (Workbench, CLI, etc.).
2.  Create a database named `buildright`.
3.  Execute the schema scripts (found in `Backend/schema.sql` or similar if you created them, otherwise export your current DB).
4.  Run `npm run seed` in the `Backend` folder to populate initial data (if applicable).

## 4. How to Run Locally

1.  **Backend**:
    ```bash
    cd Backend
    npm install
    npm start
    ```
2.  **Frontend**:
    ```bash
    cd Frontend
    npm install
    npm run dev
    ```
3.  Visit `http://localhost:5173`.

## 5. Deployment Notes

- **Images**: Uploaded images are stored in `Backend/public/uploads`. This folder is ignored by Git. In a production environment, consider using cloud storage (AWS S3) or ensure the uploads folder is persisted.
- **Production Build**: To deploy the frontend, run `npm run build` to generate static files in `dist/`.

## 6. GitHub

To push this project:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```
