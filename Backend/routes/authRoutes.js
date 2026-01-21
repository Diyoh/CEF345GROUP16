import express from 'express';
import { register, login, getMe, logout, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout); // [NEW] Logout route
router.post('/logout', logout); // [NEW] Logout route
router.put('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

export default router;
