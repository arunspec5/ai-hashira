import { AWSBedrockService } from '../services/aws-bedrock.service.js';
import SummaryPreference from '../models/summary-preference.model.js';
import SummaryCache from '../models/summary-cache.model.js';
import Message from '../models/message.model.js';
import Group from '../models/group.model.js';
import mongoose from 'mongoose';

// Initialize AWS Bedrock service
const awsBedrockService = new AWSBedrockService({
  region: process.env.AWS_REGION,
  profile: process.env.AWS_PROFILE || 'default'
});

/**
 * Generate a summary of group chat messages
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateSummary = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user._id;
    const { timeRange = 'all', topics = [], detailLevel = 'moderate' } = req.body;
    
    // Input validation
    if (timeRange && !['hour', 'day', 'week', 'all'].includes(timeRange)) {
      return res.status(400).json({ 
        error: 'Invalid time range', 
        message: 'Time range must be one of: hour, day, week, all' 
      });
    }
    
    if (detailLevel && !['brief', 'moderate', 'detailed'].includes(detailLevel)) {
      return res.status(400).json({ 
        error: 'Invalid detail level', 
        message: 'Detail level must be one of: brief, moderate, detailed' 
      });
    }
    
    if (topics && !Array.isArray(topics)) {
      return res.status(400).json({ 
        error: 'Invalid topics format', 
        message: 'Topics must be provided as an array' 
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
    
    // Get messages based on time range
    let query = { groupId };
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (timeRange) {
        case 'hour':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }
      
      query.createdAt = { $gte: startDate };
    }
    
    try {
      const messages = await Message.find(query)
        .populate('senderId', 'fullName')
        .sort({ createdAt: 1 });
      
      if (messages.length === 0) {
        return res.status(400).json({ 
          error: 'No messages available', 
          message: 'No messages found for summarization in the selected time range' 
        });
      }
      
      // Check if we have a valid cached summary
      try {
        // Sort topics for consistent cache lookup
        const sortedTopics = [...topics].sort();
        
        // Get the latest message ID for cache validation
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const lastMessageId = lastMessage ? lastMessage._id : null;
        
        // Try to find a cached summary
        const cachedSummary = await SummaryCache.findOne({
          groupId,
          timeRange,
          detailLevel,
          topics: { $size: sortedTopics.length, $all: sortedTopics }
        }).sort({ createdAt: -1 });
        
        // Check if cache is valid
        const isCacheValid = cachedSummary && 
                            lastMessageId && 
                            cachedSummary.lastMessageId && 
                            cachedSummary.lastMessageId.toString() === lastMessageId.toString() &&
                            cachedSummary.messageCount === messages.length;
        
        if (isCacheValid) {
          console.log(`Using cached summary for group ${groupId}`);
          
          // Save user preferences
          await SummaryPreference.findOneAndUpdate(
            { userId },
            { userId, timeRange, topics: sortedTopics, detailLevel },
            { upsert: true, new: true }
          );
          
          return res.status(200).json({ 
            content: cachedSummary.content,
            cached: true,
            cachedAt: cachedSummary.createdAt
          });
        }
        
        // Generate summary using AWS Bedrock
        const summary = await awsBedrockService.generateSummary(messages, {
          timeRange,
          topics: sortedTopics,
          detailLevel
        });
        
        // Calculate cache expiration time based on time range
        let expirationTime;
        switch (timeRange) {
          case 'hour':
            expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            break;
          case 'day':
            expirationTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            break;
          case 'week':
            expirationTime = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
            break;
          default: // 'all'
            expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        }
        
        // Estimate token usage (simple approximation)
        const inputTokens = Math.ceil(messages.reduce((acc, msg) => acc + (msg.text?.length || 0), 0) / 4);
        const outputTokens = Math.ceil(summary.length / 4);
        
        // Save to cache
        await SummaryCache.create({
          groupId,
          timeRange,
          topics: sortedTopics,
          detailLevel,
          content: summary,
          messageCount: messages.length,
          lastMessageId: lastMessageId,
          tokenUsage: {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens
          },
          expiresAt: expirationTime
        });
        
        // Save user preferences
        await SummaryPreference.findOneAndUpdate(
          { userId },
          { userId, timeRange, topics: sortedTopics, detailLevel },
          { upsert: true, new: true }
        );
        
        res.status(200).json({ content: summary });
      } catch (bedrockError) {
        console.error('AWS Bedrock error:', bedrockError);
        
        // Check for user-friendly message in the enhanced error
        if (bedrockError.userMessage) {
          return res.status(500).json({ 
            error: 'AI summary generation failed', 
            message: bedrockError.userMessage 
          });
        }
        
        // Handle specific AWS Bedrock errors
        if (bedrockError.name === 'AccessDeniedException' || bedrockError.code === 'AccessDeniedException') {
          return res.status(500).json({ 
            error: 'Authentication error', 
            message: 'Failed to authenticate with AWS Bedrock. Please contact support.' 
          });
        }
        
        if (bedrockError.name === 'ThrottlingException' || bedrockError.code === 'ThrottlingException') {
          return res.status(429).json({ 
            error: 'Rate limit exceeded', 
            message: 'Too many summary requests. Please try again later.' 
          });
        }
        
        if (bedrockError.name === 'ValidationException' || bedrockError.code === 'ValidationException') {
          return res.status(400).json({ 
            error: 'Invalid request', 
            message: 'The summary request was invalid. Please try with different parameters.' 
          });
        }
        
        // Generic error fallback
        return res.status(500).json({ 
          error: 'Summary generation failed', 
          message: 'Failed to generate summary. Please try again later.' 
        });
      }
    } catch (dbError) {
      console.error('Database error when fetching messages:', dbError);
      return res.status(500).json({ 
        error: 'Database error', 
        message: 'Failed to retrieve messages from the database' 
      });
    }
  } catch (error) {
    console.error('Unexpected error in summary generation:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'An unexpected error occurred. Please try again later.' 
    });
  }
};

/**
 * Get user's summary preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const preferences = await SummaryPreference.findOne({ userId });
    
    if (!preferences) {
      return res.status(200).json({
        timeRange: 'all',
        topics: [],
        detailLevel: 'moderate'
      });
    }
    
    res.status(200).json(preferences);
  } catch (error) {
    console.error('Error getting user preferences:', error);
    res.status(500).json({ error: 'Failed to get user preferences' });
  }
};

/**
 * Update user's summary preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateUserPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { timeRange, topics, detailLevel } = req.body;
    
    // Validate inputs
    if (timeRange && !['hour', 'day', 'week', 'all'].includes(timeRange)) {
      return res.status(400).json({ error: 'Invalid time range' });
    }
    
    if (detailLevel && !['brief', 'moderate', 'detailed'].includes(detailLevel)) {
      return res.status(400).json({ error: 'Invalid detail level' });
    }
    
    if (topics && !Array.isArray(topics)) {
      return res.status(400).json({ error: 'Topics must be an array' });
    }
    
    const preferences = await SummaryPreference.findOneAndUpdate(
      { userId },
      { userId, timeRange, topics, detailLevel },
      { upsert: true, new: true }
    );
    
    res.status(200).json(preferences);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
};