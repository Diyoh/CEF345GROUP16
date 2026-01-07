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
    password: process.env.DB_PASS,   // Database password
    database: process.env.DB_NAME,   // The specific database name (e.g., buildright)
    waitForConnections: true,        // Wait if all connections are busy
    connectionLimit: 10,             // Max number of simultaneous connections
    queueLimit: 0,                   // Unlimited queue for waiting requests
    
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

export default pool; // Export the pool to be used in controllers
