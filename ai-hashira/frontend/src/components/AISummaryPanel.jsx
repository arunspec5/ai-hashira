import { useState, useEffect } from "react";
import { useGroupChatStore } from "../store/useGroupChatStore";
import { X, RefreshCw, Sparkles } from "lucide-react";

const AISummaryPanel = ({ onClose }) => {
  const { selectedGroup, groupMessages } = useGroupChatStore();
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate a summary of the conversation
  const generateSummary = async () => {
    if (!selectedGroup) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call an API endpoint
      // that processes the messages and returns a summary
      
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const messages = groupMessages[selectedGroup._id] || [];
      
      // Simple mock summary generation
      const topics = ["Project updates", "Deadline discussion", "Task assignments"];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const messageCount = messages.length;
      const participantCount = new Set(messages.map(m => 
        typeof m.senderId === 'object' ? m.senderId._id : m.senderId
      )).size;
      
      const mockSummary = `
## Conversation Summary

This conversation has **${messageCount} messages** from **${participantCount} participants**.

### Main Topics
- ${randomTopic}
- General discussion

### Key Points
- Team discussed upcoming deadlines
- Several action items were assigned
- Next meeting scheduled for Friday

### Action Items
- Complete project documentation
- Review pull requests
- Prepare for client presentation
      `;
      
      setSummary(mockSummary);
    } catch (err) {
      console.error("Error generating summary:", err);
      setError("Failed to generate summary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate summary when the component mounts
  useEffect(() => {
    generateSummary();
  }, [selectedGroup?._id]);

  return (
    <div className="w-80 border-l border-base-300 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-base-300 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h3 className="font-semibold">AI Summary</h3>
        </div>
        <button 
          onClick={onClose}
          className="btn btn-sm btn-ghost btn-circle"
        >
          <X size={18} />
        </button>
      </div>

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
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Refresh Summary
        </button>
        <p className="text-xs text-base-content/60 mt-2 text-center">
          AI-generated summary based on conversation content
        </p>
      </div>
    </div>
  );
};

export default AISummaryPanel;