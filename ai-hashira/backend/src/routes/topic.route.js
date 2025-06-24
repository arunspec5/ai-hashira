import express from 'express';
import { 
  getTopics, 
  generateTopics, 
  getTopicMessages, 
  getTopicSettings, 
  updateTopicSettings 
} from '../controllers/topic.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Apply rate limiting to topic generation
// Limit to 5 requests per 5 minutes
const topicGenerationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 requests per window
  message: { error: 'Too many topic generation requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Topic routes
router.get('/groups/:id/topics', protectRoute, getTopics);
router.post('/groups/:id/topics', protectRoute, topicGenerationLimiter, generateTopics);
router.get('/groups/:id/topics/:topicId/messages', protectRoute, getTopicMessages);

// Topic settings routes
router.get('/groups/:id/settings/topics', protectRoute, getTopicSettings);
router.put('/groups/:id/settings/topics', protectRoute, updateTopicSettings);

export default router;