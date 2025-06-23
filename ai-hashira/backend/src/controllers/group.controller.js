import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId, emitToGroup } from "../lib/socket.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    const creatorId = req.user._id;

    if (!name || !members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: "Invalid group data" });
    }

    // Ensure creator is included in members
    if (!members.includes(creatorId.toString())) {
      members.push(creatorId.toString());
    }

    // Create new group
    const newGroup = new Group({
      name,
      creatorId,
      members,
    });

    await newGroup.save();

    // Populate members data for response
    const populatedGroup = await Group.findById(newGroup._id).populate("members", "fullName email profilePic");

    // Notify all members about the new group
    members.forEach((memberId) => {
      const socketId = getSocketIdByUserId(memberId);
      if (socketId) {
        io.to(socketId).emit("groupCreated", populatedGroup);
      }
    });

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error("Error in createGroup controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all groups for the current user
export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ members: userId })
      .populate("members", "fullName email profilePic")
      .populate("creatorId", "fullName email profilePic")
      .populate("lastMessage");

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getGroups controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a specific group by ID
export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id)
      .populate("members", "fullName email profilePic")
      .populate("creatorId", "fullName email profilePic")
      .populate("lastMessage");

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is a member of the group
    if (!group.members.some(member => member._id.toString() === userId.toString())) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in getGroupById controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update a group
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, groupPic } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is the creator of the group
    if (group.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only the group creator can update the group" });
    }

    // Update group fields
    if (name) group.name = name;
    if (groupPic) group.groupPic = groupPic;

    await group.save();

    // Get updated group with populated fields
    const updatedGroup = await Group.findById(id)
      .populate("members", "fullName email profilePic")
      .populate("creatorId", "fullName email profilePic")
      .populate("lastMessage");

    // Notify all members about the group update
    emitToGroup(id, "groupUpdated", updatedGroup);

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error in updateGroup controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a group
export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is the creator of the group
    if (group.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only the group creator can delete the group" });
    }

    // Store members for notification before deletion
    const members = [...group.members];

    await Group.findByIdAndDelete(id);

    // Notify all members about the group deletion
    members.forEach((memberId) => {
      const socketId = getSocketIdByUserId(memberId.toString());
      if (socketId) {
        io.to(socketId).emit("groupDeleted", { groupId: id });
      }
    });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error in deleteGroup controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to get socket ID by user ID
function getSocketIdByUserId(userId) {
  return getReceiverSocketId(userId);
}

// Add members to a group
export const addMembersToGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { members } = req.body;
    const userId = req.user._id;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: "Invalid members data" });
    }

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is the creator of the group
    if (group.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only the group creator can add members" });
    }

    // Filter out members that are already in the group
    const newMembers = members.filter(
      (memberId) => !group.members.includes(memberId)
    );

    if (newMembers.length === 0) {
      return res.status(400).json({ error: "All users are already members of this group" });
    }

    // Add new members to the group
    group.members = [...group.members, ...newMembers];
    await group.save();

    // Get updated group with populated fields
    const updatedGroup = await Group.findById(id)
      .populate("members", "fullName email profilePic")
      .populate("creatorId", "fullName email profilePic")
      .populate("lastMessage");

    // Notify all members about the group update
    emitToGroup(id, "groupUpdated", updatedGroup);

    // Notify new members specifically
    newMembers.forEach((memberId) => {
      const socketId = getSocketIdByUserId(memberId);
      if (socketId) {
        io.to(socketId).emit("groupCreated", updatedGroup);
      }
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error in addMembersToGroup controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove a member from a group
export const removeMemberFromGroup = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is the creator of the group
    if (group.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Only the group creator can remove members" });
    }

    // Check if the member to be removed is the creator
    if (memberId === group.creatorId.toString()) {
      return res.status(400).json({ error: "Cannot remove the group creator" });
    }

    // Check if the user is a member of the group
    if (!group.members.includes(memberId)) {
      return res.status(400).json({ error: "User is not a member of this group" });
    }

    // Remove the member from the group
    group.members = group.members.filter(
      (id) => id.toString() !== memberId
    );
    await group.save();

    // Get updated group with populated fields
    const updatedGroup = await Group.findById(id)
      .populate("members", "fullName email profilePic")
      .populate("creatorId", "fullName email profilePic")
      .populate("lastMessage");

    // Notify all remaining members about the group update
    emitToGroup(id, "groupUpdated", updatedGroup);

    // Notify removed member
    const removedMemberSocketId = getSocketIdByUserId(memberId);
    if (removedMemberSocketId) {
      io.to(removedMemberSocketId).emit("removedFromGroup", { groupId: id });
    }

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error in removeMemberFromGroup controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Leave a group (for members to leave groups they're in)
export const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is a member of the group
    if (!group.members.some(memberId => memberId.toString() === userId.toString())) {
      return res.status(400).json({ error: "You are not a member of this group" });
    }

    // Check if the user is the creator
    if (group.creatorId.toString() === userId.toString()) {
      return res.status(400).json({ error: "Group creator cannot leave the group. Transfer ownership or delete the group instead." });
    }

    // Remove the user from the group
    group.members = group.members.filter(
      (memberId) => memberId.toString() !== userId.toString()
    );
    await group.save();

    // Get updated group with populated fields
    const updatedGroup = await Group.findById(id)
      .populate("members", "fullName email profilePic")
      .populate("creatorId", "fullName email profilePic")
      .populate("lastMessage");

    // Notify all remaining members about the group update
    emitToGroup(id, "groupUpdated", updatedGroup);

    res.status(200).json({ message: "You have left the group successfully" });
  } catch (error) {
    console.error("Error in leaveGroup controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get messages for a group
export const getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is a member of the group
    if (!group.members.some(memberId => memberId.toString() === userId.toString())) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    // Get messages for the group
    const messages = await Message.find({ groupId: id })
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getGroupMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send a message to a group
export const sendGroupMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, image } = req.body;
    const senderId = req.user._id;
    
    console.log('Sending message to group:', { id, text, image: !!image, senderId });

    const group = await Group.findById(id);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Check if user is a member of the group
    if (!group.members.some(memberId => memberId.toString() === senderId.toString())) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    let imageUrl;
    if (image) {
      try {
        // Upload base64 image to cloudinary
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
      } catch (error) {
        console.error('Error uploading image to cloudinary:', error);
        // Continue without the image if cloudinary upload fails
      }
    }

    // Create new message
    const newMessage = new Message({
      senderId,
      groupId: id,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    // Update group's lastMessage
    group.lastMessage = newMessage._id;
    await group.save();

    // Populate sender info for response
    const populatedMessage = await Message.findById(newMessage._id).populate("senderId", "fullName profilePic");

    // Notify all group members about the new message
    emitToGroup(id, "newGroupMessage", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};