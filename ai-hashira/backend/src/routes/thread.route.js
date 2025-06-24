import express from "express";
import { getThreadMessages, getThreadCount, generateThreadSummary } from "../controllers/thread.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Get thread messages for a parent message
router.get("/:parentId", protectRoute, getThreadMessages);

// Get thread count for a parent message
router.get("/:parentId/count", protectRoute, getThreadCount);

// Apply rate limiting to summary generation
// Limit to 10 requests per 5 minutes
const summaryLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per window
  message: { error: 'Too many summary requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate thread summary
router.post("/:parentId/summary", protectRoute, summaryLimiter, generateThreadSummary);

export default router;