import express from 'express';
import { generateSummary, getUserPreferences, updateUserPreferences } from '../controllers/summary.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Apply rate limiting to summary generation
// Limit to 10 requests per 5 minutes
const summaryLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per window
  message: { error: 'Too many summary requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Group summary routes
router.post('/groups/:id/summary', protectRoute, summaryLimiter, generateSummary);

// User preference routes
router.get('/users/summary-preferences', protectRoute, getUserPreferences);
router.put('/users/summary-preferences', protectRoute, updateUserPreferences);

export default router;