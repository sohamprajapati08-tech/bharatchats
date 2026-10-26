import { Router } from 'express';
import {
  createStatus,
  getStatusFeed,
  viewStatus,
  getStatusViewers,
  deleteStatus,
} from '../controllers/status.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(authenticateToken);
router.use(apiLimiter);

router.post('/', createStatus);
router.get('/feed', getStatusFeed);
router.post('/:statusId/view', viewStatus);
router.get('/:statusId/viewers', getStatusViewers);
router.delete('/:statusId', deleteStatus);

export default router;
