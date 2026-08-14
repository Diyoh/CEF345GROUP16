/**
 * DATABASE CONFIGURATION
 * This file creates a reusable connection pool to the MySQL database.
 * Using a pool is better than a single connection because it allows multiple
 * database queries to run in parallel and handles reconnection automatically.
 */

import mysql from 'mysql2/promise'; // Use the 'promise' version for async/await support
import dotenv from 'dotenv';

// Load environment variables so we can access DB credentials
dotenv.config();

// Create the Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,       // Database server address (e.g., localhost)
    user: process.env.DB_USER,       // Database username
    password: process.env.DB_PASS || process.env.DB_PASSWORD,   // Database password (support both naming conventions)
    database: process.env.DB_NAME,   // The specific database name (e.g., buildright)
    port: process.env.DB_PORT || 3306, // Custom port support (needed for Aiven)
    waitForConnections: true,        // Wait if all connections are busy
    connectionLimit: 10,             // Max number of simultaneous connections
    queueLimit: 0,                   // Unlimited queue for waiting requests
    // Enable SSL if explicitly set OR if in production (Render/Aiven usually sidebar SSL)
    ssl: (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : undefined,
    
    // Custom Type Casting
    // MySQL 'DECIMAL' types are returned as strings by default to preserve precision.
    // Here we convert them to JavaScript Numbers for easier math in the backend.
    typeCast: function (field, next) {
        if (field.type === "DECIMAL" || field.type === "NEWDECIMAL") {
            var value = field.string();
            return (value === null) ? null : Number(value);
        }
        return next();
    }
});

// Test the connection logic immediately when the server starts
// This helps debug configuration errors early
pool.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        connection.release(); // Always release the connection back to the pool!
    })
    .catch(err => {
        console.error('Database connection failed:', err.message);
    });

/**
 * withTransaction
 *
 * Runs `work` against a single dedicated connection inside a transaction, committing on
 * success and rolling back on any thrown error. The connection is always released.
 *
 * WHY THIS MATTERS HERE:
 * Several operations write more than one row and are only correct as a unit:
 *
 *  - Registration inserts a user AND marks the access code used. A failure between the two
 *    leaves a spent code still marked available — a second person could claim the same
 *    ADMIN grant.
 *  - Creating a project inserts the project AND its images. A Cloudinary or network failure
 *    mid-loop leaves a published project with a partial photo set, which in a transparency
 *    product means the public record shows less evidence than was actually submitted.
 *
 * Usage:
 *   await withTransaction(async (tx) => {
 *       await tx.query('INSERT ...');
 *       await tx.query('UPDATE ...');
 *   });
 *
 * Pass `tx` down to any helper that writes; a helper that closes over `pool` instead runs
 * OUTSIDE the transaction and silently defeats it.
 */
export const withTransaction = async (work) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export default pool; // Export the pool to be used in controllers
