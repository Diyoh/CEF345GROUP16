import express from 'express';
import { getTeam, createTeamMember, updateTeamMember, deleteTeamMember } from '../controllers/teamController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', getTeam);
router.post('/', protect, authorize('PLATFORM_ADMIN', 'DEVELOPER_ADMIN'), upload.single('image'), createTeamMember);
router.put('/:id', protect, authorize('PLATFORM_ADMIN', 'DEVELOPER_ADMIN'), upload.single('image'), updateTeamMember);
router.delete('/:id', protect, authorize('PLATFORM_ADMIN', 'DEVELOPER_ADMIN'), deleteTeamMember);

export default router;
