import { useState, useEffect, useRef } from "react";
import { useGroupChatStore } from "../store/useGroupChatStore";
import { useTopicStore } from "../store/useTopicStore";
import { X, RefreshCw, MessageSquare, Settings, AlertCircle } from "lucide-react";
import TopicSettings from "./TopicSettings";

const TopicPanel = ({ onClose }) => {
  const { selectedGroup } = useGroupChatStore();
  const { 
    topics, 
    selectedTopic, 
    setSelectedTopic, 
    getTopics, 
    generateTopics, 
    isTopicsLoading,
    getTopicSettings,
    topicSettings
  } = useTopicStore();
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState(null);
  
  // Rate limiting state
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState(null);
  const lastRequestTime = useRef(0);
  const minRequestInterval = 3000; // 3 seconds between requests

  // Load topics and settings when the component mounts or when the selected group changes
  useEffect(() => {
    if (selectedGroup) {
      loadTopicsAndSettings();
    }
    
    return () => {
      setSelectedTopic(null);
    };
  }, [selectedGroup?._id]);
  
  // Load topics and settings with error handling
  const loadTopicsAndSettings = async () => {
    if (!selectedGroup) return;
    
    try {
      // Clear any previous errors
      setError(null);
      
      // Load settings first
      await getTopicSettings(selectedGroup._id);
      
      // Then load topics
      await getTopics(selectedGroup._id);
    } catch (err) {
      console.error('Error loading topics or settings:', err);
      setError('Failed to load topics. Please try again.');
    }
  };

  // Check if we're currently rate limited
  const checkRateLimit = () => {
    // Check if we're in a rate-limited state
    if (isRateLimited && rateLimitResetTime) {
      const now = Date.now();
      if (now < rateLimitResetTime) {
        // Still rate limited
        const secondsRemaining = Math.ceil((rateLimitResetTime - now) / 1000);
        setError(`Rate limit reached. Please wait ${secondsRemaining} seconds before trying again.`);
        return true;
      } else {
        // Rate limit expired
        setIsRateLimited(false);
        setRateLimitResetTime(null);
      }
    }
    
    // Check minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    if (timeSinceLastRequest < minRequestInterval) {
      const waitTime = Math.ceil((minRequestInterval - timeSinceLastRequest) / 1000);
      setError(`Please wait ${waitTime} seconds between topic requests.`);
      return true;
    }
    
    return false;
  };
  
  const handleRefreshTopics = async () => {
    if (!selectedGroup) return;
    
    // Check rate limiting
    if (checkRateLimit()) return;
    
    // Clear any previous errors
    setError(null);
    lastRequestTime.current = Date.now();
    
    try {
      await generateTopics(selectedGroup._id);
    } catch (err) {
      console.error('Error generating topics:', err);
      
      // Handle different error scenarios
      if (err.response) {
        const statusCode = err.response.status;
        const errorData = err.response.data;
        
        if (statusCode === 400) {
          // Bad request - likely not enough messages
          setError(errorData.message || "Not enough messages to generate topics.");
        } else if (statusCode === 429) {
          // Too many requests - rate limited
          setIsRateLimited(true);
          
          // Set reset time to 5 minutes from now if not provided in headers
          const resetTime = new Date(Date.now() + 5 * 60 * 1000);
          setRateLimitResetTime(resetTime.getTime());
          setError(errorData.message || "Rate limit exceeded. Please wait a few minutes and try again.");
        } else if (statusCode === 500 && errorData.message?.includes('AWS Bedrock')) {
          // AWS Bedrock service unavailable
          setError(
            <div className="text-center">
              <p>AI service is currently unavailable.</p>
              <p className="text-xs mt-1">Try again later or contact support if the issue persists.</p>
            </div>
          );
        } else {
          // Other server errors
          setError(errorData.message || errorData.error || "Failed to generate topics. Please try again later.");
        }
      } else {
        // Network or other errors
        setError("Failed to generate topics. Please check your connection and try again.");
      }
    }
  };

  return (
    <div className="w-80 border-l border-base-300 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-base-300 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-primary" />
          <h3 className="font-semibold">Conversation Topics</h3>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="btn btn-sm btn-ghost btn-circle"
            title="Topic Settings"
          >
            <Settings size={16} />
          </button>
          <button 
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <TopicSettings 
          onClose={() => setShowSettings(false)}
          onRefresh={handleRefreshTopics}
        />
      )}

      {/* Topics List */}
      <div className="flex-1 overflow-y-auto">
        {isTopicsLoading ? (
          <div className="flex flex-col items-center justify-center h-40">
            <div className="loading loading-spinner loading-md text-primary"></div>
            <p className="mt-2 text-sm text-base-content/70">Loading topics...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
            <div className="flex items-center gap-2 text-error mb-2">
              <AlertCircle size={18} />
              <p>{error}</p>
            </div>
            <button 
              onClick={loadTopicsAndSettings}
              className="btn btn-sm btn-outline mt-4"
              disabled={isRateLimited}
            >
              Try Again
            </button>
          </div>
        ) : !topicSettings.enabled ? (
          <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
            <p className="text-base-content/70">Topic clustering is disabled</p>
            <button 
              onClick={() => setShowSettings(true)}
              className="btn btn-sm btn-outline mt-4"
            >
              Enable in Settings
            </button>
          </div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
            <p className="text-base-content/70">No topics found</p>
            <button 
              onClick={handleRefreshTopics}
              className="btn btn-sm btn-outline mt-4"
              disabled={isRateLimited}
            >
              Generate Topics
            </button>
            <div className="divider text-xs text-base-content/50">or</div>
            <button
              onClick={() => {
                // Create a fallback "General" topic
                const generalTopic = {
                  _id: 'general-fallback',
                  label: 'General',
                  description: 'All messages in this group chat',
                  groupId: selectedGroup._id,
                  isActive: true,
                  isFallback: true // Mark as fallback for special handling
                };
                setSelectedTopic(generalTopic);
              }}
              className="btn btn-sm btn-ghost"
            >
              View All Messages
            </button>
          </div>
        ) : (
          <ul className="menu p-2">
            {topics.map(topic => (
              <li key={topic._id}>
                <button
                  className={`${selectedTopic?._id === topic._id ? 'active' : ''}`}
                  onClick={() => setSelectedTopic(topic)}
                >
                  <div>
                    <div className="font-medium">{topic.label}</div>
                    <div className="text-xs text-base-content/70 truncate">
                      {topic.description}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-base-300">
        <button 
          onClick={handleRefreshTopics}
          className="btn btn-sm btn-outline w-full flex items-center gap-2"
          disabled={isTopicsLoading || !topicSettings.enabled || isRateLimited}
        >
          <RefreshCw size={14} className={isTopicsLoading ? "animate-spin" : ""} />
          Refresh Topics
        </button>
        
        {isRateLimited && rateLimitResetTime && (
          <div className="flex items-center gap-1 text-warning text-xs mt-2 justify-center">
            <AlertCircle size={12} />
            <span>
              Rate limited. Resets in {Math.ceil((rateLimitResetTime - Date.now()) / 1000)}s
            </span>
          </div>
        )}
        
        <p className="text-xs text-base-content/60 mt-2 text-center">
          AI-powered topic clustering
        </p>
      </div>
    </div>
  );
};

export default TopicPanel;