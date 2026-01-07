import express from 'express';
import { getTeam, updateTeamMember } from '../controllers/teamController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getTeam);
router.put('/:id', protect, authorize('DEVELOPER_ADMIN'), updateTeamMember);

export default router;
