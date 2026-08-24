import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { getProfile, saveProfile, addDocument, getQueue, verify } from '../controllers/contractorController.js';

const router = express.Router();

// A contractor manages their own profile and documents.
router.get('/profile', protect, authorize('CONTRACTOR'), getProfile);
router.put('/profile', protect, authorize('CONTRACTOR'), saveProfile);
router.post('/documents', protect, authorize('CONTRACTOR'), upload.single('file'), addDocument);

// Verification. The route gate is coarse; the service checks that an
// ENTITY_ADMIN actually belongs to MINTP.
router.get('/queue', protect, authorize('PLATFORM_ADMIN', 'ENTITY_ADMIN'), getQueue);
router.post('/:userId/verify', protect, authorize('PLATFORM_ADMIN', 'ENTITY_ADMIN'), verify);

export default router;
