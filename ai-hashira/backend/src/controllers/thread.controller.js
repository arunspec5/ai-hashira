import Message from "../models/message.model.js";

// Get thread messages for a parent message
export const getThreadMessages = async (req, res) => {
  try {
    const { parentId } = req.params;
    
    // Find the parent message first to verify it exists
    const parentMessage = await Message.findById(parentId);
    if (!parentMessage) {
      return res.status(404).json({ message: "Parent message not found" });
    }
    
    // Find all thread replies for this parent
    const threadMessages = await Message.find({ 
      parentId,
      isThreadReply: true 
    })
    .populate("senderId", "_id username fullName profilePic")
    .sort({ createdAt: 1 });
    
    console.log("Thread messages found:", threadMessages.length);
    
    res.status(200).json(threadMessages);
  } catch (error) {
    console.error("Error in getThreadMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get thread count for a parent message
export const getThreadCount = async (req, res) => {
  try {
    const { parentId } = req.params;
    
    const count = await Message.countDocuments({
      parentId,
      isThreadReply: true
    });
    
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error in getThreadCount controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};