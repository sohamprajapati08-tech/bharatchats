import { Router } from 'express';
import { uploadMiddleware, handleUpload, serveFile } from '../controllers/media.controller.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/upload', authenticateToken, uploadLimiter, uploadMiddleware.single('file'), handleUpload);
router.get('/file/:filename', optionalAuth, serveFile);

export default router;
