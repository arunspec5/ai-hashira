import { useState, useEffect, useRef } from "react";
import { useGroupChatStore } from "../store/useGroupChatStore";
import { X, RefreshCw, Sparkles, Settings, AlertCircle } from "lucide-react";
import SummaryOptions from "./SummaryOptions";
import { axiosInstance } from "../lib/axios";

const AISummaryPanel = ({ onClose }) => {
  const { selectedGroup, groupMessages } = useGroupChatStore();
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [summaryOptions, setSummaryOptions] = useState({
    timeRange: "all",
    topics: [],
    detailLevel: "moderate"
  });
  
  // Rate limiting state
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(10); // Default limit
  const [rateLimitResetTime, setRateLimitResetTime] = useState(null);
  const lastRequestTime = useRef(0);
  const minRequestInterval = 3000; // 3 seconds between requests

  // Load user preferences when component mounts
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const response = await axiosInstance.get('/users/summary-preferences');
        setSummaryOptions(response.data);
      } catch (err) {
        console.error("Error loading summary preferences:", err);
        // Continue with default preferences if loading fails
      }
    };
    
    loadUserPreferences();
  }, []);

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
      setError(`Please wait ${waitTime} seconds between summary requests.`);
      return true;
    }
    
    return false;
  };

  // Generate a summary of the conversation
  const generateSummary = async () => {
    if (!selectedGroup) return;
    
    // Check rate limiting
    if (checkRateLimit()) return;
    
    setIsLoading(true);
    setError(null);
    lastRequestTime.current = Date.now();
    
    try {
      const response = await axiosInstance.post(`/groups/${selectedGroup._id}/summary`, {
        ...summaryOptions
      });
      
      // Update rate limit info from headers if available
      const rateLimitHeader = response.headers['x-ratelimit-remaining'];
      if (rateLimitHeader) {
        setRateLimitRemaining(parseInt(rateLimitHeader, 10));
      }
      
      setSummary(response.data.content);
      
      // If this was a cached response, show a notification
      if (response.data.cached) {
        const cachedTime = new Date(response.data.cachedAt).toLocaleTimeString();
        console.log(`Using cached summary from ${cachedTime}`);
      }
    } catch (err) {
      console.error("Error generating summary:", err);
      
      // Handle different error scenarios with user-friendly messages
      if (err.response) {
        // The request was made and the server responded with an error status
        const statusCode = err.response.status;
        const errorData = err.response.data;
        
        if (statusCode === 400) {
          // Bad request - likely invalid parameters
          setError(errorData.message || "Invalid summary request. Please check your options and try again.");
        } else if (statusCode === 403) {
          // Forbidden - user not authorized
          setError(errorData.message || "You don't have permission to generate a summary for this group.");
        } else if (statusCode === 404) {
          // Not found - group doesn't exist
          setError(errorData.message || "The group was not found.");
        } else if (statusCode === 429) {
          // Too many requests - rate limited
          setIsRateLimited(true);
          
          // Set reset time to 5 minutes from now if not provided in headers
          const resetHeader = err.response.headers['x-ratelimit-reset'];
          const resetTime = resetHeader 
            ? new Date(parseInt(resetHeader, 10) * 1000) 
            : new Date(Date.now() + 5 * 60 * 1000);
          
          setRateLimitResetTime(resetTime.getTime());
          setError(errorData.message || "Rate limit exceeded. Please wait a few minutes and try again.");
        } else {
          // Other server errors
          setError(errorData.message || errorData.error || "Failed to generate summary. Please try again later.");
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError("No response from server. Please check your internet connection and try again.");
      } else {
        // Something happened in setting up the request
        setError("Failed to send summary request. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Generate summary when the component mounts or options change
  useEffect(() => {
    if (selectedGroup) {
      generateSummary();
    }
  }, [selectedGroup?._id, summaryOptions]);

  return (
    <div className="w-80 border-l border-base-300 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-base-300 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h3 className="font-semibold">AI Summary</h3>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="btn btn-sm btn-ghost btn-circle"
            title="Summary Options"
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

      {/* Options Panel */}
      {showOptions && (
        <SummaryOptions 
          options={summaryOptions}
          onChange={setSummaryOptions}
          onClose={() => setShowOptions(false)}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="loading loading-spinner loading-lg text-primary"></div>
            <p className="mt-4 text-sm text-base-content/70">Generating summary...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-error">
            <p>{error}</p>
            <button 
              onClick={generateSummary}
              className="btn btn-sm btn-outline mt-4"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br>') }} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-base-300">
        <button 
          onClick={generateSummary}
          className="btn btn-sm btn-outline w-full flex items-center gap-2"
          disabled={isLoading || isRateLimited}
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Refresh Summary
        </button>
        
        {isRateLimited && rateLimitResetTime && (
          <div className="flex items-center gap-1 text-warning text-xs mt-2 justify-center">
            <AlertCircle size={12} />
            <span>
              Rate limited. Resets in {Math.ceil((rateLimitResetTime - Date.now()) / 1000)}s
            </span>
          </div>
        )}
        
        {!isRateLimited && rateLimitRemaining < 5 && (
          <div className="text-xs text-warning mt-2 text-center">
            {rateLimitRemaining} summary requests remaining
          </div>
        )}
        
        <p className="text-xs text-base-content/60 mt-2 text-center">
          AI-generated summary powered by AWS Bedrock
        </p>
      </div>
    </div>
  );
};

export default AISummaryPanel;