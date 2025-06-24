import express from "express";
import { getThreadMessages, getThreadCount } from "../controllers/thread.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Get thread messages for a parent message
router.get("/:parentId", protectRoute, getThreadMessages);

// Get thread count for a parent message
router.get("/:parentId/count", protectRoute, getThreadCount);

export default router;