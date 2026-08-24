import express from 'express';
import { getEntities, getEntity } from '../controllers/entityController.js';

const router = express.Router();

// Public reads. The hierarchy and what each body works on is public information.
router.get('/', getEntities);
router.get('/:code', getEntity);

export default router;
