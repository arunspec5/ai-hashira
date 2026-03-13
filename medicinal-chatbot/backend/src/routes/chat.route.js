import express from "express";
import { processChatMessage } from "../services/chatService.js";

const router = express.Router();

// In-memory user context (per session - in production use proper session/DB)
const userContexts = new Map();

router.post("/chat", (req, res) => {
  try {
    const { message, sessionId, userContext } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Update stored context if provided
    if (userContext) {
      userContexts.set(sessionId, userContext);
    }

    const context = userContexts.get(sessionId) || userContext || {};
    const response = processChatMessage(message, context);

    res.json(response);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      text: "Sorry, I encountered an error. Please try again.",
      type: "bot",
    });
  }
});

router.post("/user-details", (req, res) => {
  try {
    const { sessionId, ...userContext } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    userContexts.set(sessionId, {
      name: userContext.name || "",
      age: userContext.age || "",
      gender: userContext.gender || "",
      conditions: userContext.conditions || [],
      allergies: userContext.allergies || [],
    });

    res.json({
      success: true,
      message: "Details saved. How can I help you today?",
    });
  } catch (error) {
    console.error("User details error:", error);
    res.status(500).json({ error: "Failed to save details" });
  }
});

export default router;
