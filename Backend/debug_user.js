import pool from './config/db.js';
import bcrypt from 'bcryptjs';

const checkUser = async () => {
    try {
        const email = 'sg@buildright.cm';
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            console.log(`User ${email} NOT FOUND in database.`);
        } else {
            console.log(`User found:`, users[0]);
            const isMatch = await bcrypt.compare('password', users[0].password_hash);
            console.log(`Password 'password' match? ${isMatch}`);

            // RESET PASSWORD
            const salt = await bcrypt.genSalt(10);
            const newHash = await bcrypt.hash('password', salt);
            await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [newHash, email]);
            console.log('Password reset to "password"');
        }
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkUser();
