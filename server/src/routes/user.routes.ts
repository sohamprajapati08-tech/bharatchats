import { Router } from 'express';
import {
  searchUsers,
  updateProfile,
  updatePrivacy,
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
} from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(authenticateToken);
router.use(apiLimiter);

router.get('/search', searchUsers);
router.patch('/profile', updateProfile);
router.patch('/privacy', updatePrivacy);
router.post('/block', blockUser);
router.post('/unblock', unblockUser);
router.get('/blocked', getBlockedUsers);
router.post('/report', reportUser);

export default router;
