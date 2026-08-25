import express from 'express';
import { generateAccessCode, getAccessCodes } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/access-codes', protect, authorize('DEVELOPER_ADMIN', 'PLATFORM_ADMIN'), generateAccessCode);
router.get('/access-codes', protect, authorize('DEVELOPER_ADMIN', 'PLATFORM_ADMIN'), getAccessCodes);

// Contractor Management
import { getContractors, getContractorStats } from '../controllers/adminController.js';
router.get('/contractors', protect, authorize('PLATFORM_ADMIN', 'ENTITY_ADMIN'), getContractors);
router.get('/contractors/:id/stats', protect, authorize('PLATFORM_ADMIN'), getContractorStats);

export default router;
