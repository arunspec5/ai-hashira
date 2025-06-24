import { useState, useEffect, useRef, useMemo } from "react";
import { useTopicStore } from "../store/useTopicStore";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupChatStore } from "../store/useGroupChatStore";
import { ArrowLeft, MessageCircleReply, ThumbsUp, ThumbsDown } from "lucide-react";
import { formatMessageTime } from "../lib/utils";
import toast from "react-hot-toast";

const TopicMessageView = () => {
  const { selectedTopic, topicMessages, setSelectedTopic, isMessagesLoading } = useTopicStore();
  const { authUser } = useAuthStore();
  const { threadCounts, openThread } = useGroupChatStore();
  
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Get messages for the selected topic
  // If it's a fallback "General" topic, we'll fetch all group messages
  const messages = useMemo(() => {
    if (!selectedTopic) return [];
    
    // If it's a fallback "General" topic, use all group messages
    if (selectedTopic.isFallback) {
      return useGroupChatStore.getState().groupMessages[selectedTopic.groupId] || [];
    }
    
    // Otherwise use the topic-specific messages
    return topicMessages[selectedTopic._id] || [];
  }, [selectedTopic, topicMessages]);
  
  // Load messages for the selected topic
  useEffect(() => {
    if (selectedTopic && !selectedTopic.isFallback) {
      // Only fetch messages for non-fallback topics
      useTopicStore.getState().getTopicMessages(selectedTopic.groupId, selectedTopic._id);
    }
  }, [selectedTopic]);
  
  // Scroll to bottom when messages load
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0 && !isMessagesLoading) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMessagesLoading]);
  
  if (!selectedTopic) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-base-content/70">Select a topic to view messages</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-base-300 flex items-center gap-2">
        <button 
          onClick={() => setSelectedTopic(null)}
          className="btn btn-sm btn-ghost btn-circle"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h3 className="font-semibold">{selectedTopic.label}</h3>
          <p className="text-xs text-base-content/70">{selectedTopic.description}</p>
        </div>
      </div>
      
      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {isMessagesLoading ? (
          <div className="flex flex-col items-center justify-center h-40">
            <div className="loading loading-spinner loading-md text-primary"></div>
            <p className="mt-2 text-sm text-base-content/70">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <p className="text-base-content/70">No messages in this topic</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId._id === authUser._id;
            
            return (
              <div
                key={message._id}
                className={`chat ${isOwnMessage ? "chat-end" : "chat-start"}`}
              >
                <div className="chat-image avatar">
                  <div className="size-10 rounded-full border">
                    <img
                      src={message.senderId.profilePic || "/avatar.png"}
                      alt={message.senderId.fullName || "User"}
                    />
                  </div>
                </div>
                <div className="chat-header mb-1">
                  {!isOwnMessage && (
                    <span className="font-medium mr-2">{message.senderId.fullName}</span>
                  )}
                  <time className="text-xs opacity-50">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </div>
                <div className={`chat-bubble ${isOwnMessage ? "chat-bubble-primary" : ""}`}>
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md mb-2"
                    />
                  )}
                  {message.text && <p>{message.text}</p>}
                </div>
                <div className="chat-footer opacity-50 text-xs mt-1">
                  <button 
                    onClick={() => openThread(message)}
                    className="hover:underline flex items-center gap-1"
                  >
                    <MessageCircleReply size={14} />
                    {threadCounts && typeof threadCounts[message._id] === 'number' && threadCounts[message._id] > 0 ? 
                      `${threadCounts[message._id]} ${threadCounts[message._id] === 1 ? 'reply' : 'replies'}` : 
                      'Reply'}
                  </button>
                </div>
              </div>
            );
          })
        )}
        
        {/* Scroll to bottom reference */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Topic Summary and Feedback */}
      <div className="p-4 border-t border-base-300 bg-base-200">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="text-sm font-medium mb-1">Topic Summary</h4>
            <p className="text-sm">{selectedTopic.description}</p>
            {selectedTopic.isFallback && (
              <p className="text-xs text-warning mt-1">
                This is a fallback view showing all messages. Generate topics for a better experience.
              </p>
            )}
          </div>
          
          {/* Feedback buttons - only show for non-fallback topics */}
          {!selectedTopic.isFallback && (
            !feedbackSubmitted ? (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs text-base-content/70">Is this topic accurate?</span>
                <button 
                  className="btn btn-sm btn-ghost btn-circle text-success"
                  onClick={() => {
                    toast.success('Thank you for your feedback!');
                    setFeedbackSubmitted(true);
                    // In a real implementation, we would send this feedback to the server
                    // to improve future topic clustering
                  }}
                  title="This topic is accurate"
                >
                  <ThumbsUp size={16} />
                </button>
                <button 
                  className="btn btn-sm btn-ghost btn-circle text-error"
                  onClick={() => {
                    toast.success('Thank you for your feedback!');
                    setFeedbackSubmitted(true);
                    // In a real implementation, we would send this feedback to the server
                    // to improve future topic clustering
                  }}
                  title="This topic is not accurate"
                >
                  <ThumbsDown size={16} />
                </button>
              </div>
            ) : (
              <div className="text-xs text-success ml-4">
                Feedback submitted
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicMessageView;