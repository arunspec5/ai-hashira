import TopicClusteringService from '../services/topic-clustering.service.js';
import Topic from '../models/topic.model.js';
import TopicSettings from '../models/topic-settings.model.js';
import Message from '../models/message.model.js';
import Group from '../models/group.model.js';
import mongoose from 'mongoose';
import { emitTopicUpdate, emitTopicMessageUpdate } from '../lib/socket.js';

// Initialize Topic Clustering service
const topicService = new TopicClusteringService({
  region: process.env.AWS_REGION,
  profile: process.env.AWS_PROFILE || 'default'
});

/**
 * Get topics for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTopics = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user._id;
    
    // Input validation
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ 
        error: 'Invalid group ID', 
        message: 'The provided group ID is not valid' 
      });
    }
    
    // Verify user is a member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        error: 'Group not found',
        message: 'The requested group does not exist'
      });
    }
    
    if (!group.members.some(memberId => memberId.toString() === userId.toString())) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'You are not a member of this group' 
      });
    }
    
    // Get topic settings
    const settings = await TopicSettings.findOne({ groupId });
    
    // If topic clustering is disabled, return empty array
    if (settings && !settings.enabled) {
      return res.status(200).json([]);
    }
    
    // Get topics for the group
    const topics = await Topic.find({ groupId, isActive: true })
      .sort({ lastMessageAt: -1 });
    
    res.status(200).json(topics);
  } catch (error) {
    console.error('Error getting topics:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to retrieve topics. Please try again later.' 
    });
  }
};

/**
 * Generate topics for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateTopics = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user._id;
    const { minMessages, timeThreshold } = req.body;
    
    // Input validation
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ 
        error: 'Invalid group ID', 
        message: 'The provided group ID is not valid' 
      });
    }
    
    if (minMessages !== undefined && (isNaN(minMessages) || minMessages < 2 || minMessages > 20)) {
      return res.status(400).json({ 
        error: 'Invalid minMessages parameter', 
        message: 'minMessages must be a number between 2 and 20' 
      });
    }
    
    if (timeThreshold !== undefined && (isNaN(timeThreshold) || timeThreshold < 10 || timeThreshold > 1440)) {
      return res.status(400).json({ 
        error: 'Invalid timeThreshold parameter', 
        message: 'timeThreshold must be a number between 10 and 1440 (minutes)' 
      });
    }
    
    // Verify user is a member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        error: 'Group not found',
        message: 'The requested group does not exist'
      });
    }
    
    if (!group.members.some(memberId => memberId.toString() === userId.toString())) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'You are not a member of this group' 
      });
    }
    
    // Get or create topic settings
    let settings = await TopicSettings.findOne({ groupId });
    if (!settings) {
      settings = new TopicSettings({
        groupId,
        enabled: true,
        minMessages: minMessages || 5,
        timeThreshold: timeThreshold || 60
      });
    } else {
      // Update settings if provided
      if (minMessages !== undefined) settings.minMessages = minMessages;
      if (timeThreshold !== undefined) settings.timeThreshold = timeThreshold;
    }
    
    // Save settings
    await settings.save();
    
    try {
      // Generate topics
      const topics = await topicService.generateTopics(groupId, {
        minMessages: settings.minMessages,
        timeThreshold: settings.timeThreshold
      });
      
      // Update settings with last processed message
      const lastMessage = await Message.findOne({ groupId })
        .sort({ createdAt: -1 });
        
      if (lastMessage) {
        settings.lastProcessedMessageId = lastMessage._id;
        await settings.save();
      }
      
      // Emit topic update to all group members via socket
      emitTopicUpdate(groupId, topics);
      
      res.status(200).json(topics);
    } catch (topicError) {
      console.error('Topic generation error:', topicError);
      
      // Handle specific errors
      if (topicError.message.includes('Not enough messages')) {
        return res.status(400).json({ 
          error: 'Insufficient messages', 
          message: topicError.message 
        });
      }
      
      // Generic error fallback
      return res.status(500).json({ 
        error: 'Topic generation failed', 
        message: 'Failed to generate topics. Please try again later.' 
      });
    }
  } catch (error) {
    console.error('Error generating topics:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'An unexpected error occurred. Please try again later.' 
    });
  }
};

/**
 * Get messages for a specific topic
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTopicMessages = async (req, res) => {
  try {
    const { id: groupId, topicId } = req.params;
    const userId = req.user._id;
    
    // Input validation
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ 
        error: 'Invalid ID', 
        message: 'The provided group ID or topic ID is not valid' 
      });
    }
    
    // Verify user is a member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        error: 'Group not found',
        message: 'The requested group does not exist'
      });
    }
    
    if (!group.members.some(memberId => memberId.toString() === userId.toString())) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'You are not a member of this group' 
      });
    }
    
    // Get the topic
    const topic = await Topic.findOne({ _id: topicId, groupId });
    if (!topic) {
      return res.status(404).json({ 
        error: 'Topic not found',
        message: 'The requested topic does not exist in this group'
      });
    }
    
    // Get messages for the topic
    const messages = await Message.find({
      _id: { $in: topic.messageIds },
      groupId
    })
    .populate('senderId', 'fullName username profilePic')
    .sort({ createdAt: 1 });
    
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error getting topic messages:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to retrieve topic messages. Please try again later.' 
    });
  }
};

/**
 * Get topic settings for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTopicSettings = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user._id;
    
    // Input validation
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ 
        error: 'Invalid group ID', 
        message: 'The provided group ID is not valid' 
      });
    }
    
    // Verify user is a member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        error: 'Group not found',
        message: 'The requested group does not exist'
      });
    }
    
    if (!group.members.some(memberId => memberId.toString() === userId.toString())) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'You are not a member of this group' 
      });
    }
    
    // Get settings
    let settings = await TopicSettings.findOne({ groupId });
    
    if (!settings) {
      // Return default settings if none exist
      settings = {
        enabled: true,
        minMessages: 5,
        timeThreshold: 60
      };
    }
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error getting topic settings:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to retrieve topic settings. Please try again later.' 
    });
  }
};

/**
 * Update topic settings for a group
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateTopicSettings = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user._id;
    const { enabled, minMessages, timeThreshold } = req.body;
    
    // Input validation
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ 
        error: 'Invalid group ID', 
        message: 'The provided group ID is not valid' 
      });
    }
    
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        error: 'Invalid enabled parameter', 
        message: 'enabled must be a boolean value' 
      });
    }
    
    if (minMessages !== undefined && (isNaN(minMessages) || minMessages < 2 || minMessages > 20)) {
      return res.status(400).json({ 
        error: 'Invalid minMessages parameter', 
        message: 'minMessages must be a number between 2 and 20' 
      });
    }
    
    if (timeThreshold !== undefined && (isNaN(timeThreshold) || timeThreshold < 10 || timeThreshold > 1440)) {
      return res.status(400).json({ 
        error: 'Invalid timeThreshold parameter', 
        message: 'timeThreshold must be a number between 10 and 1440 (minutes)' 
      });
    }
    
    // Verify user is a group admin
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        error: 'Group not found',
        message: 'The requested group does not exist'
      });
    }
    
    // Check if user is the group creator (admin)
    if (group.creatorId.toString() !== userId.toString()) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Only the group creator can update topic settings' 
      });
    }
    
    // Update settings
    const settings = await TopicSettings.findOneAndUpdate(
      { groupId },
      { 
        groupId,
        ...(enabled !== undefined && { enabled }),
        ...(minMessages !== undefined && { minMessages }),
        ...(timeThreshold !== undefined && { timeThreshold })
      },
      { upsert: true, new: true }
    );
    
    // If topic clustering was disabled, emit an empty topics array to update UI
    if (enabled === false) {
      emitTopicUpdate(groupId, []);
    }
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error updating topic settings:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to update topic settings. Please try again later.' 
    });
  }
};

export default {
  getTopics,
  generateTopics,
  getTopicMessages,
  getTopicSettings,
  updateTopicSettings
};