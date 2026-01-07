import express from 'express';
import { getGlobalStats } from '../controllers/statsController.js';

const router = express.Router();

router.get('/global', getGlobalStats);

export default router;
