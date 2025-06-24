import Message from "../models/message.model.js";
import { AWSBedrockService } from '../services/aws-bedrock.service.js';
import SummaryPreference from '../models/summary-preference.model.js';
import SummaryCache from '../models/summary-cache.model.js';
import mongoose from 'mongoose';

// Initialize AWS Bedrock service
const awsBedrockService = new AWSBedrockService({
  region: process.env.AWS_REGION,
  profile: process.env.AWS_PROFILE || 'default'
});

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

/**
 * Generate a summary of thread messages
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateThreadSummary = async (req, res) => {
  try {
    const { parentId } = req.params;
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
    
    // Find the parent message first to verify it exists
    const parentMessage = await Message.findById(parentId);
    if (!parentMessage) {
      return res.status(404).json({ 
        error: 'Thread not found',
        message: 'The requested thread does not exist'
      });
    }
    
    // Get all messages in the thread
    try {
      // First get the parent message
      const parent = await Message.findById(parentId)
        .populate('senderId', 'fullName');
      
      if (!parent) {
        return res.status(404).json({ 
          error: 'Thread parent not found',
          message: 'The parent message for this thread does not exist'
        });
      }
      
      // Then get all thread replies
      const threadReplies = await Message.find({ 
        parentId,
        isThreadReply: true 
      })
      .populate('senderId', 'fullName')
      .sort({ createdAt: 1 });
      
      // Combine parent and replies for the complete thread
      const allMessages = [parent, ...threadReplies];
      
      if (allMessages.length === 0) {
        return res.status(400).json({ 
          error: 'No messages available', 
          message: 'No messages found for summarization in this thread' 
        });
      }
      
      // Check if we have a valid cached summary
      try {
        // Sort topics for consistent cache lookup
        const sortedTopics = [...topics].sort();
        
        // Get the latest message ID for cache validation
        const lastMessage = threadReplies.length > 0 ? threadReplies[threadReplies.length - 1] : parent;
        const lastMessageId = lastMessage ? lastMessage._id : null;
        
        // Try to find a cached summary
        const cachedSummary = await SummaryCache.findOne({
          threadId: parentId,
          timeRange,
          detailLevel,
          topics: { $size: sortedTopics.length, $all: sortedTopics }
        }).sort({ createdAt: -1 });
        
        // Check if cache is valid
        const isCacheValid = cachedSummary && 
                            lastMessageId && 
                            cachedSummary.lastMessageId && 
                            cachedSummary.lastMessageId.toString() === lastMessageId.toString() &&
                            cachedSummary.messageCount === allMessages.length;
        
        if (isCacheValid) {
          console.log(`Using cached summary for thread ${parentId}`);
          
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
        const summary = await awsBedrockService.generateThreadSummary(allMessages, {
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
        const inputTokens = Math.ceil(allMessages.reduce((acc, msg) => acc + (msg.text?.length || 0), 0) / 4);
        const outputTokens = Math.ceil(summary.length / 4);
        
        // Save to cache
        await SummaryCache.create({
          threadId: parentId,
          timeRange,
          topics: sortedTopics,
          detailLevel,
          content: summary,
          messageCount: allMessages.length,
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
      console.error('Database error when fetching thread messages:', dbError);
      return res.status(500).json({ 
        error: 'Database error', 
        message: 'Failed to retrieve thread messages from the database' 
      });
    }
  } catch (error) {
    console.error('Unexpected error in thread summary generation:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: 'An unexpected error occurred. Please try again later.' 
    });
  }
};