import pool from './config/db.js';

const listContractors = async () => {
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE role = "CONTRACTOR"');
        console.log('--- CONTRACTORS ---');
        console.log(JSON.stringify(users, null, 2));
        
        // Also check unique contractor names in projects table that might not have accounts
        const [projects] = await pool.query('SELECT DISTINCT contractor_name FROM projects');
        console.log('--- PROJECT CONTRACTOR NAMES ---');
        console.log(projects.map(p => p.contractor_name));
        
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listContractors();
