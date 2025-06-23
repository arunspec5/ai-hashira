import express from "express";
import { 
  createGroup, 
  getGroups, 
  getGroupById, 
  updateGroup, 
  deleteGroup,
  addMembersToGroup,
  removeMemberFromGroup,
  leaveGroup,
  getGroupMessages,
  sendGroupMessage
} from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply authentication middleware to all group routes
router.use(protectRoute);

// Group CRUD routes
router.post("/", createGroup);
router.get("/", getGroups);
router.get("/:id", getGroupById);
router.put("/:id", updateGroup);
router.delete("/:id", deleteGroup);

// Group member management routes
router.post("/:id/members", addMembersToGroup);
router.delete("/:id/members/:memberId", removeMemberFromGroup);
router.delete("/:id/leave", leaveGroup);

// Group message routes
router.get("/:id/messages", getGroupMessages);
router.post("/:id/messages", sendGroupMessage);

export default router;