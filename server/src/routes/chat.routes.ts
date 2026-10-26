import { Router } from 'express';
import {
  getConversations,
  getOrCreateDirectChat,
  createGroup,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  markAsRead,
  toggleMute,
  toggleArchive,
  searchMessages,
  manageGroupMembers,
} from '../controllers/chat.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(authenticateToken);
router.use(apiLimiter);

router.get('/conversations', getConversations);
router.post('/conversations/direct', getOrCreateDirectChat);
router.post('/conversations/group', createGroup);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);
router.post('/conversations/:conversationId/read', markAsRead);
router.post('/conversations/:conversationId/mute', toggleMute);
router.post('/conversations/:conversationId/archive', toggleArchive);
router.post('/conversations/:conversationId/members', manageGroupMembers);

router.patch('/messages/:messageId', editMessage);
router.delete('/messages/:messageId', deleteMessage);
router.post('/messages/:messageId/react', reactToMessage);

router.get('/messages/search', searchMessages);

export default router;
