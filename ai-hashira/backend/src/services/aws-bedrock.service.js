import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { fromSSO } from "@aws-sdk/credential-providers";

export class AWSBedrockService {
  constructor(config = {}) {
    // Initialize AWS SDK with credentials and region
    this.region = config.region || process.env.AWS_REGION || 'us-east-1';
    this.profile = config.profile || process.env.AWS_PROFILE || 'default';
    
    // Initialize the Bedrock Runtime client with SSO credentials
    this.bedrockRuntime = new BedrockRuntimeClient({
      region: this.region,
      credentials: fromSSO({
        profile: this.profile
      })
    });
    
    // Default model settings
    this.defaultModel = config.defaultModel || 'anthropic.claude-v2';
    this.maxRetries = config.maxRetries || 3;
    this.tokenLimit = config.tokenLimit || 8000; // Limit for input tokens
    this.maxOutputTokens = config.maxOutputTokens || 2000; // Limit for output tokens
  }

  /**
   * Generate a summary of chat messages using AWS Bedrock
   * @param {Array} messages - Array of chat messages
   * @param {Object} options - Options for summary generation
   * @returns {Promise<string>} - Generated summary
   */
  async generateSummary(messages, options = {}) {
    const {
      model = this.defaultModel,
      timeRange = 'all',
      topics = [],
      detailLevel = 'moderate'
    } = options;
    
    // Create a prompt for the AI model
    const prompt = this.createSummaryPrompt(messages, options);
    
    // Call AWS Bedrock API with retry logic
    const response = await this.invokeModelWithRetry(model, prompt);
    
    // Process and return the summary
    return this.processSummaryResponse(response, model);
  }
  
  /**
   * Create a well-structured prompt for the AI model
   * @param {Array} messages - Array of chat messages
   * @param {Object} options - Options for summary generation
   * @returns {string} - Formatted prompt
   */
  createSummaryPrompt(messages, options) {
    const { detailLevel, topics, timeRange } = options;
    
    // Filter messages based on time range if specified
    let filteredMessages = [...messages];
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
      
      filteredMessages = messages.filter(msg => new Date(msg.createdAt) >= startDate);
    }
    
    // Start building the prompt
    let prompt = `Human: Please summarize the following group chat conversation. `;
    
    // Add detail level instruction
    if (detailLevel === "brief") {
      prompt += "Provide a brief overview of the main points. ";
    } else if (detailLevel === "detailed") {
      prompt += "Provide a detailed summary with all key information. ";
    } else {
      prompt += "Provide a moderately detailed summary of the important points. ";
    }
    
    // Add topic focus if specified
    if (topics && topics.length > 0) {
      prompt += `Focus particularly on these topics: ${topics.join(", ")}. `;
    }
    
    // Add structure instructions
    prompt += `
Structure your summary with the following sections:
1. Main Topics - List the main topics discussed
2. Key Points - Summarize the most important points
3. Decisions - List any decisions that were made
4. Action Items - List any tasks or action items mentioned

Conversation:
`;
    
    // Format messages
    const formattedMessages = filteredMessages.map(msg => {
      const sender = typeof msg.senderId === 'object' ? msg.senderId.fullName : 'User';
      return `[${new Date(msg.createdAt).toLocaleString()}] ${sender}: ${msg.text || ''}`;
    }).join("\n");
    
    prompt += formattedMessages;
    prompt += "\n\nAssistant:";
    
    // Ensure the prompt doesn't exceed token limit
    if (this.estimateTokens(prompt) > this.tokenLimit) {
      // If too long, truncate messages but keep the instructions
      const instructions = prompt.split("Conversation:")[0] + "Conversation:\n";
      const truncatedMessages = this.truncateMessages(filteredMessages, this.tokenLimit - this.estimateTokens(instructions) - 100);
      
      prompt = instructions + truncatedMessages + "\n\nAssistant:";
    }
    
    return prompt;
  }
  
  /**
   * Invoke AWS Bedrock model with retry logic
   * @param {string} modelId - ID of the model to use
   * @param {string} prompt - Prompt for the model
   * @returns {Promise<Object>} - Model response
   */
  /**
   * Invoke AWS Bedrock model with retry logic and enhanced error handling
   * @param {string} modelId - ID of the model to use
   * @param {string} prompt - Prompt for the model
   * @returns {Promise<Object>} - Model response
   * @throws {Error} - Enhanced error with details about the failure
   */
  async invokeModelWithRetry(modelId, prompt) {
    let retries = 0;
    let lastError = null;
    
    while (retries < this.maxRetries) {
      try {
        // Prepare the request body based on the model
        let body;
        
        if (modelId.startsWith('anthropic.claude')) {
          body = JSON.stringify({
            prompt: prompt,
            max_tokens_to_sample: this.maxOutputTokens,
            temperature: 0.7,
            top_k: 250,
            top_p: 0.999,
            stop_sequences: ["Human:"]
          });
        } else if (modelId.startsWith('amazon.titan')) {
          body = JSON.stringify({
            inputText: prompt,
            textGenerationConfig: {
              maxTokenCount: this.maxOutputTokens,
              temperature: 0.7,
              topP: 0.9
            }
          });
        } else {
          throw new Error(`Unsupported model: ${modelId}. Please use a supported model like anthropic.claude-v2 or amazon.titan.`);
        }
        
        // Create the command
        const command = new InvokeModelCommand({
          modelId: modelId,
          contentType: "application/json",
          accept: "application/json",
          body: body
        });
        
        // Send the request
        const response = await this.bedrockRuntime.send(command);
        
        // Parse and return the response
        const parsedResponse = JSON.parse(new TextDecoder().decode(response.body));
        
        // Check for empty or invalid response
        if (!parsedResponse) {
          throw new Error('Empty response received from AWS Bedrock');
        }
        
        // Check for model-specific error indicators
        if (modelId.startsWith('anthropic.claude') && !parsedResponse.completion) {
          throw new Error('Invalid response format from Claude model');
        } else if (modelId.startsWith('amazon.titan') && !parsedResponse.results?.[0]?.outputText) {
          throw new Error('Invalid response format from Titan model');
        }
        
        return parsedResponse;
      } catch (error) {
        lastError = error;
        retries++;
        
        // Log the error with details for debugging
        console.error(`AWS Bedrock error (attempt ${retries}/${this.maxRetries}):`, {
          error: error.message,
          errorName: error.name,
          errorCode: error.code,
          modelId,
          timestamp: new Date().toISOString()
        });
        
        // Handle specific error types with appropriate strategies
        if (error.name === 'ThrottlingException' || error.code === 'ThrottlingException') {
          // Implement exponential backoff for rate limiting
          const backoffTime = 1000 * Math.pow(2, retries);
          console.log(`Rate limited by AWS Bedrock. Retrying in ${backoffTime/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        } else if (error.name === 'ServiceUnavailableException' || error.code === 'ServiceUnavailableException') {
          // Service unavailable - wait longer before retry
          const backoffTime = 2000 * Math.pow(2, retries);
          console.log(`AWS Bedrock service unavailable. Retrying in ${backoffTime/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        } else if (error.name === 'ValidationException' || error.code === 'ValidationException') {
          // Validation errors are client-side and won't be fixed by retrying
          const enhancedError = new Error(`AWS Bedrock validation error: ${error.message}`);
          enhancedError.originalError = error;
          enhancedError.userMessage = 'The request to generate a summary was invalid. Please try with different parameters.';
          throw enhancedError;
        } else if (error.name === 'AccessDeniedException' || error.code === 'AccessDeniedException') {
          // Authentication/authorization errors
          const enhancedError = new Error(`AWS Bedrock access denied: ${error.message}`);
          enhancedError.originalError = error;
          enhancedError.userMessage = 'Access to AWS Bedrock was denied. Please check your credentials and permissions.';
          throw enhancedError;
        }
        
        // Check if we've reached max retries
        if (retries === this.maxRetries) {
          const enhancedError = new Error(`Failed to invoke AWS Bedrock model after ${this.maxRetries} retries: ${error.message}`);
          enhancedError.originalError = error;
          enhancedError.userMessage = 'Unable to generate summary after multiple attempts. Please try again later.';
          enhancedError.retryAttempts = this.maxRetries;
          throw enhancedError;
        }
        
        // For other errors, wait a bit before retrying with linear backoff
        const backoffTime = 1000 * retries;
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
    
    // This should not be reached due to the throw in the retry loop,
    // but adding as a fallback
    const finalError = new Error('Failed to invoke AWS Bedrock model after exhausting retries');
    finalError.originalError = lastError;
    finalError.userMessage = 'Unable to generate summary. Please try again later.';
    throw finalError;
  }
  
  /**
   * Process the response from AWS Bedrock
   * @param {Object} response - Response from AWS Bedrock
   * @param {string} modelId - ID of the model used
   * @returns {string} - Processed summary
   */
  processSummaryResponse(response, modelId) {
    if (!response) {
      throw new Error('Empty response from AWS Bedrock');
    }
    
    // Extract the summary based on the model
    if (modelId.startsWith('anthropic.claude')) {
      return response.completion || '';
    } else if (modelId.startsWith('amazon.titan')) {
      return response.results?.[0]?.outputText || '';
    } else {
      throw new Error(`Unsupported model: ${modelId}`);
    }
  }
  
  /**
   * Estimate the number of tokens in a string
   * This is a more accurate approximation than just character count
   * @param {string} text - Text to estimate tokens for
   * @returns {number} - Estimated token count
   */
  estimateTokens(text) {
    if (!text) return 0;
    
    // More accurate token estimation:
    // - Count words (split by whitespace)
    // - Count punctuation marks
    // - Count special tokens like line breaks
    
    // Count words (approximately 1 token per word)
    const words = text.split(/\s+/).filter(word => word.length > 0).length;
    
    // Count punctuation (approximately 1 token per punctuation mark)
    const punctuation = (text.match(/[.,!?;:()\[\]{}"'`~@#$%^&*\-+=<>|/\\]/g) || []).length;
    
    // Count special tokens (newlines, tabs, etc.)
    const specialTokens = (text.match(/\n|\t|\r/g) || []).length;
    
    // Count numbers (approximately 1 token per 2-3 digits)
    const numbers = (text.match(/\d+/g) || []).join('').length / 2;
    
    // Add a base overhead for the prompt structure
    const overhead = 5;
    
    return Math.ceil(words + punctuation + specialTokens + numbers + overhead);
  }
  
  /**
   * Truncate messages to fit within token limit
   * @param {Array} messages - Array of messages
   * @param {number} tokenLimit - Maximum tokens allowed
   * @returns {string} - Truncated messages as a string
   */
  truncateMessages(messages, tokenLimit) {
    // Start with most recent messages and work backwards
    const reversedMessages = [...messages].reverse();
    let result = [];
    let totalTokens = 0;
    
    for (const msg of reversedMessages) {
      const sender = typeof msg.senderId === 'object' ? msg.senderId.fullName : 'User';
      const formattedMsg = `[${new Date(msg.createdAt).toLocaleString()}] ${sender}: ${msg.text || ''}`;
      const msgTokens = this.estimateTokens(formattedMsg);
      
      if (totalTokens + msgTokens <= tokenLimit) {
        result.unshift(formattedMsg); // Add to beginning to restore original order
        totalTokens += msgTokens;
      } else {
        break;
      }
    }
    
    // Add a note if messages were truncated
    if (result.length < messages.length) {
      result.unshift(`[NOTE: Showing only the ${result.length} most recent messages out of ${messages.length} total messages due to length constraints]`);
    }
    
    return result.join("\n");
  }
}

export default AWSBedrockService;