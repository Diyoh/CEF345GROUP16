/**
 * AUTHENTICATION MIDDLEWARE
 */

import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

/**
 * protect
 * [SECURITY FIX] Now reads from HttpOnly Cookie (req.cookies.token)
 * instead of Authorization header.
 */
export const protect = async (req, res, next) => {
    let token;

    // Check Cookie first (preferred), then Header (fallback if needed for mobile apps etc)
    if (req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // The actor carries its institution: entity-scoped rules and the MINTP
        // verification power both read it, and one join here beats one lookup in
        // every service.
        const [rows] = await pool.query(
            `SELECT u.id, u.name, u.email, u.role, u.entity_id,
                    e.code AS entity_code, e.type AS entity_type,
                    e.name_en AS entity_name_en, e.name_fr AS entity_name_fr
             FROM users u
             LEFT JOIN gov_entities e ON u.entity_id = e.id
             WHERE u.id = ?`,
            [decoded.id]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Not authorized, user not found' });
        }

        req.user = rows[0];
        next();

    } catch (error) {
        console.error(error);
        return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                error: `User role ${req.user.role} is not authorized to access this route` 
            });
        }
        next();
    };
};
