import AWSBedrockService from './aws-bedrock.service.js';
import Topic from '../models/topic.model.js';
import Message from '../models/message.model.js';
import TopicSettings from '../models/topic-settings.model.js';

export class TopicClusteringService {
  constructor(config = {}) {
    this.awsBedrockService = new AWSBedrockService({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      profile: config.profile || process.env.AWS_PROFILE || 'default',
      defaultModel: config.model || 'anthropic.claude-v2',
      maxRetries: config.maxRetries || 3,
      tokenLimit: config.tokenLimit || 8000,
      maxOutputTokens: config.maxOutputTokens || 2000
    });
  }

  /**
   * Generate topics for a group chat
   * @param {string} groupId - ID of the group
   * @param {Object} options - Options for topic generation
   * @returns {Promise<Array>} - Array of generated topics
   */
  async generateTopics(groupId, options = {}) {
    const { minMessages = 5, timeThreshold = 60 } = options;
    
    // Get messages for the group
    const messages = await Message.find({ groupId })
      .populate('senderId', 'fullName username')
      .sort({ createdAt: 1 });
    
    if (messages.length < minMessages) {
      throw new Error("Not enough messages to generate topics. Minimum required: " + minMessages + ", found: " + messages.length);
    }
    
    // Format messages for the AI model
    const formattedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      sender: msg.senderId?.fullName || msg.senderId?.username || 'Unknown User',
      content: msg.text || '',
      timestamp: msg.createdAt
    }));
    
    // Generate topics using AWS Bedrock
    const topics = await this.identifyTopics(formattedMessages);
    
    // Save topics to database
    const savedTopics = await this.saveTopics(groupId, topics);
    
    return savedTopics;
  }
  
  /**
   * Identify topics in a conversation using AWS Bedrock
   * @param {Array} messages - Array of formatted messages
   * @returns {Promise<Array>} - Array of identified topics
   */
  async identifyTopics(messages) {
    try {
      // Create a prompt for the AI model
      const prompt = this.createTopicIdentificationPrompt(messages);
      
      // Call AWS Bedrock
      const response = await this.awsBedrockService.invokeModelWithRetry(
        'anthropic.claude-v2',
        prompt
      );
      
      // Parse the response to extract topics
      return this.parseTopicsResponse(response, messages);
    } catch (error) {
      console.error('Error identifying topics:', error);
      throw new Error("Failed to identify topics: " + error.message);
    }
  }
  
  /**
   * Create a prompt for topic identification
   * @param {Array} messages - Array of formatted messages
   * @returns {string} - Formatted prompt
   */
  createTopicIdentificationPrompt(messages) {
    // Truncate messages if there are too many to fit in the context window
    const maxMessages = 100; // Adjust based on token limits
    const messagesToProcess = messages.length > maxMessages 
      ? messages.slice(messages.length - maxMessages) 
      : messages;
    
    // Add a note if messages were truncated
    const truncationNote = messages.length > maxMessages 
      ? "Note: Only analyzing the " + maxMessages + " most recent messages out of " + messages.length + " total messages due to length constraints.\n\n" 
      : '';
    
    let prompt = "Human: I need you to analyze the following group chat conversation and identify distinct topics or threads of conversation. This is for a feature that will help users navigate multiple simultaneous conversations in a group chat.\n\n";
    
    prompt += truncationNote;
    prompt += "For each topic you identify:\n";
    prompt += "1. Provide a short, descriptive label (3-5 words max) that clearly represents the subject matter\n";
    prompt += "2. List the message IDs that belong to this topic\n";
    prompt += "3. Provide a brief 1-2 sentence summary of the topic\n\n";
    
    prompt += "Guidelines for high-quality topic identification:\n";
    prompt += "- Identify 3-7 distinct topics, depending on the conversation complexity\n";
    prompt += "- Focus on substantive conversation threads, not greetings or small talk\n";
    prompt += "- A message can belong to multiple topics if it's relevant to more than one conversation thread\n";
    prompt += "- If a message doesn't clearly fit any topic, place it in a \"General\" category\n";
    prompt += "- Look for semantic relationships between messages, not just keyword matching\n";
    prompt += "- Consider conversation flow and context when grouping messages\n";
    prompt += "- Avoid creating too many granular topics or too few broad topics\n";
    prompt += "- Ensure topic labels are clear and descriptive enough for users to understand at a glance\n\n";
    
    prompt += "Here's the conversation:\n\n";
    
    // Add messages
    for (const msg of messagesToProcess) {
      prompt += "[ID: " + msg.id + "] [" + new Date(msg.timestamp).toLocaleString() + "] " + msg.sender + ": " + msg.content + "\n";
    }
    
    prompt += "\nPlease format your response as JSON:\n";
    prompt += "{\n";
    prompt += "  \"topics\": [\n";
    prompt += "    {\n";
    prompt += "      \"label\": \"Topic Label\",\n";
    prompt += "      \"messageIds\": [\"id1\", \"id2\", \"id3\"],\n";
    prompt += "      \"summary\": \"Brief summary of the topic\"\n";
    prompt += "    },\n";
    prompt += "    ...\n";
    prompt += "  ]\n";
    prompt += "}";
    
    // Add the required "Assistant:" turn at the end of the prompt
    prompt += "\n\nAssistant:";
    
    return prompt;
  }

  /**
   * Parse the response from AWS Bedrock to extract topics
   * @param {Object} response - Response from AWS Bedrock
   * @param {Array} messages - Original messages
   * @returns {Array} - Array of parsed topics
   */
  parseTopicsResponse(response, messages) {
    try {
      // Extract the completion from Claude's response
      const completion = response.completion;
      if (!completion) {
        throw new Error('Invalid response format from AWS Bedrock');
      }
      
      // Extract JSON from the response
      const jsonMatch = completion.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.topics || !Array.isArray(parsed.topics)) {
        throw new Error('Invalid response format: missing topics array');
      }
      
      return parsed.topics.map(topic => ({
        label: topic.label,
        description: topic.summary,
        messageIds: topic.messageIds,
        isActive: true,
        lastMessageAt: this.getLastMessageTimestamp(topic.messageIds, messages)
      }));
    } catch (error) {
      console.error('Error parsing topics response:', error);
      throw new Error("Failed to parse topics from AI response: " + error.message);
    }
  }
  
  /**
   * Get the timestamp of the last message in a topic
   * @param {Array} messageIds - Array of message IDs
   * @param {Array} messages - Array of all messages
   * @returns {Date} - Timestamp of the last message
   */
  getLastMessageTimestamp(messageIds, messages) {
    const topicMessages = messages.filter(msg => messageIds.includes(msg.id));
    if (topicMessages.length === 0) return new Date();
    
    return new Date(Math.max(...topicMessages.map(msg => new Date(msg.timestamp).getTime())));
  }
  
  /**
   * Save topics to the database
   * @param {string} groupId - ID of the group
   * @param {Array} topics - Array of topics to save
   * @returns {Promise<Array>} - Array of saved topics
   */
  async saveTopics(groupId, topics) {
    try {
      // First, mark existing topics as inactive
      await Topic.updateMany(
        { groupId, isActive: true },
        { isActive: false }
      );
      
      // Save new topics
      const savedTopics = [];
      for (const topic of topics) {
        const newTopic = new Topic({
          groupId,
          label: topic.label,
          description: topic.description,
          messageIds: topic.messageIds,
          isActive: topic.isActive,
          lastMessageAt: topic.lastMessageAt
        });
        
        await newTopic.save();
        savedTopics.push(newTopic);
      }
      
      return savedTopics;
    } catch (error) {
      console.error('Error saving topics:', error);
      throw new Error("Failed to save topics: " + error.message);
    }
  }
  
  /**
   * Update existing topics with new messages
   * @param {string} groupId - ID of the group
   * @param {Array} newMessages - Array of new messages
   * @param {Object} settings - Topic settings
   * @returns {Promise<Object>} - Result of the update operation
   */
  async updateTopicsWithNewMessages(groupId, newMessages, settings) {
    try {
      // Get existing active topics
      const existingTopics = await Topic.find({ groupId, isActive: true });
      if (existingTopics.length === 0) {
        return { success: true, status: 'no_active_topics' };
      }
      
      // If no new messages, nothing to do
      if (!newMessages || newMessages.length === 0) {
        return { success: true, status: 'no_new_messages' };
      }
      
      // Format new messages
      const formattedMessages = newMessages.map(msg => ({
        id: msg._id.toString(),
        sender: msg.senderId?.fullName || msg.senderId?.username || 'Unknown User',
        content: msg.text || '',
        timestamp: msg.createdAt
      }));
      
      // Create a prompt to classify new messages into existing topics
      const prompt = this.createTopicClassificationPrompt(existingTopics, formattedMessages);
      
      // Call AWS Bedrock
      const response = await this.awsBedrockService.invokeModelWithRetry(
        'anthropic.claude-v2',
        prompt
      );
      
      // Parse the response and update topics
      const { classifications, unclassified } = this.parseClassificationResponse(response);
      
      // Track which messages were classified
      const classifiedMessageIds = new Set();
      
      // Update topics with new message IDs
      for (const classification of classifications) {
        const topic = existingTopics.find(t => t._id.toString() === classification.topicId);
        if (topic) {
          // Add messages to this topic
          topic.messageIds.push(...classification.messageIds);
          topic.lastMessageAt = new Date();
          await topic.save();
          
          // Track which messages were classified
          classification.messageIds.forEach(id => classifiedMessageIds.add(id));
        }
      }
      
      // Check if we need to create a "General" topic for unclassified messages
      if (unclassified && unclassified.length > 0) {
        // Look for an existing General topic
        let generalTopic = existingTopics.find(t => t.label === 'General');
        
        // Create a General topic if it doesn't exist
        if (!generalTopic) {
          generalTopic = new Topic({
            groupId,
            label: 'General',
            description: 'Messages that don\'t fit into specific topics',
            messageIds: [],
            isActive: true,
            lastMessageAt: new Date()
          });
        }
        
        // Add unclassified messages to the General topic
        generalTopic.messageIds.push(...unclassified);
        generalTopic.lastMessageAt = new Date();
        await generalTopic.save();
        
        // Track these messages as classified (into General)
        unclassified.forEach(id => classifiedMessageIds.add(id));
      }
      
      // Check for any messages that weren't classified at all
      const allMessageIds = formattedMessages.map(msg => msg.id);
      const unhandledMessageIds = allMessageIds.filter(id => !classifiedMessageIds.has(id));
      
      // If there are unhandled messages, add them to General topic
      if (unhandledMessageIds.length > 0) {
        let generalTopic = existingTopics.find(t => t.label === 'General');
        
        // Create a General topic if it doesn't exist
        if (!generalTopic) {
          generalTopic = new Topic({
            groupId,
            label: 'General',
            description: 'Messages that don\'t fit into specific topics',
            messageIds: [],
            isActive: true,
            lastMessageAt: new Date()
          });
        }
        
        // Add unhandled messages to the General topic
        generalTopic.messageIds.push(...unhandledMessageIds);
        generalTopic.lastMessageAt = new Date();
        await generalTopic.save();
      }
      
      // Check for inactive topics based on time threshold
      const timeThreshold = settings.timeThreshold || 60; // minutes
      const cutoffTime = new Date(Date.now() - timeThreshold * 60 * 1000);
      
      const inactiveResult = await Topic.updateMany(
        { 
          groupId, 
          isActive: true,
          lastMessageAt: { $lt: cutoffTime }
        },
        { isActive: false }
      );
      
      return { 
        success: true, 
        status: 'updated',
        classifiedCount: classifiedMessageIds.size,
        unclassifiedCount: unclassified?.length || 0,
        inactiveTopicsCount: inactiveResult.modifiedCount
      };
    } catch (error) {
      console.error('Error updating topics with new messages:', error);
      // Don't throw here, just log the error to avoid breaking message flow
      return { 
        success: false, 
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * Create a prompt for classifying new messages into existing topics
   * @param {Array} existingTopics - Array of existing topics
   * @param {Array} newMessages - Array of new messages
   * @returns {string} - Formatted prompt
   */
  createTopicClassificationPrompt(existingTopics, newMessages) {
    // Truncate if too many new messages
    const maxNewMessages = 50; // Adjust based on token limits
    const messagesToProcess = newMessages.length > maxNewMessages 
      ? newMessages.slice(newMessages.length - maxNewMessages) 
      : newMessages;
    
    // Add a note if messages were truncated
    const truncationNote = newMessages.length > maxNewMessages 
      ? "Note: Only classifying the " + maxNewMessages + " most recent messages out of " + newMessages.length + " total new messages due to length constraints.\n\n" 
      : '';
    
    let prompt = "Human: I have some existing conversation topics and new messages from a group chat. I need you to classify these new messages into the existing topics. This is for a feature that helps users navigate multiple simultaneous conversations.\n\n";
    
    prompt += truncationNote;
    prompt += "Guidelines for accurate classification:\n";
    prompt += "- A message can belong to multiple topics if it's relevant to more than one conversation thread\n";
    prompt += "- Consider the semantic meaning and context of each message, not just keywords\n";
    prompt += "- If a message doesn't fit any existing topic, include it in the \"unclassified\" list\n";
    prompt += "- Be precise in your classification to maintain topic coherence\n\n";
    
    prompt += "Existing topics:\n";
    for (const topic of existingTopics) {
      prompt += "- Topic ID: " + topic._id.toString() + "\n";
      prompt += "  Label: " + topic.label + "\n";
      prompt += "  Description: " + topic.description + "\n\n";
    }
    
    prompt += "New messages:\n";
    for (const msg of messagesToProcess) {
      prompt += "[ID: " + msg.id + "] [" + new Date(msg.timestamp).toLocaleString() + "] " + msg.sender + ": " + msg.content + "\n";
    }
    
    prompt += "\nPlease classify each message into one or more topics, or indicate if it doesn't fit any topic.\n";
    prompt += "Format your response as JSON:\n";
    prompt += "{\n";
    prompt += "  \"classifications\": [\n";
    prompt += "    {\n";
    prompt += "      \"topicId\": \"topic_id_here\",\n";
    prompt += "      \"messageIds\": [\"message_id_1\", \"message_id_2\"]\n";
    prompt += "    },\n";
    prompt += "    ...\n";
    prompt += "  ],\n";
    prompt += "  \"unclassified\": [\"message_id_3\", \"message_id_4\"]\n";
    prompt += "}\n\n";
    prompt += "Ensure your response is valid JSON that can be parsed programmatically.";
    
    // Add the required "Assistant:" turn at the end of the prompt
    prompt += "\n\nAssistant:";
    
    return prompt;
  }
  
  /**
   * Parse the classification response from AWS Bedrock
   * @param {Object} response - Response from AWS Bedrock
   * @returns {Object} - Object containing classifications and unclassified messages
   */
  parseClassificationResponse(response) {
    try {
      // Extract the completion from Claude's response
      const completion = response.completion;
      if (!completion) {
        throw new Error('Invalid response format from AWS Bedrock');
      }
      
      // Extract JSON from the response
      const jsonMatch = completion.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.classifications || !Array.isArray(parsed.classifications)) {
        throw new Error('Invalid response format: missing classifications array');
      }
      
      // Return both classifications and unclassified messages
      return {
        classifications: parsed.classifications,
        unclassified: Array.isArray(parsed.unclassified) ? parsed.unclassified : []
      };
    } catch (error) {
      console.error('Error parsing classification response:', error);
      throw new Error("Failed to parse classification from AI response: " + error.message);
    }
  }
  
  /**
   * Process new messages and update topics
   * @param {string} groupId - ID of the group
   * @returns {Promise<void>}
   */
  async processNewMessages(groupId) {
    try {
      // Get topic settings for the group
      const settings = await TopicSettings.getSettingsForGroup(groupId);
      
      // If topic clustering is disabled, do nothing
      if (!settings.enabled) return;
      
      // Get the last processed message ID
      const lastProcessedId = settings.lastProcessedMessageId;
      
      // Query for new messages
      const query = { groupId };
      if (lastProcessedId) {
        query._id = { $gt: lastProcessedId };
      }
      
      const newMessages = await Message.find(query)
        .populate('senderId', 'fullName username')
        .sort({ createdAt: 1 });
      
      // If no new messages, do nothing
      if (newMessages.length === 0) return;
      
      // Get existing topics
      const existingTopics = await Topic.find({ groupId, isActive: true });
      
      // If no existing topics and enough new messages, generate topics
      if (existingTopics.length === 0 && newMessages.length >= settings.minMessages) {
        await this.generateTopics(groupId, {
          minMessages: settings.minMessages,
          timeThreshold: settings.timeThreshold
        });
      } 
      // If existing topics and new messages, update topics
      else if (existingTopics.length > 0 && newMessages.length > 0) {
        await this.updateTopicsWithNewMessages(groupId, newMessages, settings);
      }
      
      // Update the last processed message ID
      if (newMessages.length > 0) {
        const lastMessage = newMessages[newMessages.length - 1];
        settings.lastProcessedMessageId = lastMessage._id;
        await settings.save();
      }
    } catch (error) {
      console.error('Error processing new messages:', error);
      // Don't throw here, just log the error to avoid breaking message flow
    }
  }
  
  /**
   * Get topics for a group
   * @param {string} groupId - ID of the group
   * @returns {Promise<Array>} - Array of topics
   */
  async getTopicsForGroup(groupId) {
    try {
      // Get topic settings
      const settings = await TopicSettings.getSettingsForGroup(groupId);
      
      // If topic clustering is disabled, return empty array
      if (!settings.enabled) return [];
      
      // Process any new messages
      await this.processNewMessages(groupId);
      
      // Get active topics
      const topics = await Topic.findActiveTopicsForGroup(groupId);
      
      return topics;
    } catch (error) {
      console.error('Error getting topics for group:', error);
      throw new Error("Failed to get topics: " + error.message);
    }
  }
  
  /**
   * Get messages for a specific topic
   * @param {string} groupId - ID of the group
   * @param {string} topicId - ID of the topic
   * @returns {Promise<Array>} - Array of messages
   */
  async getMessagesForTopic(groupId, topicId) {
    try {
      // Get the topic
      const topic = await Topic.findOne({ _id: topicId, groupId });
      if (!topic) {
        throw new Error('Topic not found');
      }
      
      // Get messages for the topic
      const messages = await Message.find({
        _id: { $in: topic.messageIds },
        groupId
      })
      .populate('senderId', 'fullName username profilePic')
      .sort({ createdAt: 1 });
      
      return messages;
    } catch (error) {
      console.error('Error getting messages for topic:', error);
      throw new Error("Failed to get topic messages: " + error.message);
    }
  }
}

export default TopicClusteringService;