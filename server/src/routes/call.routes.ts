import { Router } from 'express';
import { logCall, getCallHistory } from '../controllers/call.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(authenticateToken);
router.use(apiLimiter);

router.post('/log', logCall);
router.get('/history', getCallHistory);

export default router;
