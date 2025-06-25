import { useEffect, useRef, useState, useMemo } from "react";
import { useGroupChatStore } from "../store/useGroupChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useTopicStore } from "../store/useTopicStore";
import { formatMessageTime } from "../lib/utils";
import { MessageCircleReply } from "lucide-react";

import GroupChatHeader from "./GroupChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import GroupMembersList from "./GroupMembersList";
import TopicPanel from "./TopicPanel";
import TopicMessageView from "./TopicMessageView";
import AISummaryPanel from "./AISummaryPanel";

const GroupChatContainer = () => {
  const {
    selectedGroup,
    groupMessages,
    isMessagesLoading,
    sendGroupMessage,
    subscribeToGroupMessages,
    unsubscribeFromGroupMessages,
    startTyping,
    stopTyping,
    typingUsers,
    threadCounts,
    getThreadCount,
    isAISummaryOpen
  } = useGroupChatStore();
  
  const { authUser } = useAuthStore();
  const { isTopicPanelOpen, selectedTopic, topics, closeTopicPanel, subscribeToTopicEvents, unsubscribeFromTopicEvents } = useTopicStore();
  const messageEndRef = useRef(null);
  const [showMembersList, setShowMembersList] = useState(false);
  
  // Create a map of message IDs to their topics for quick lookup
  const messageTopicsMap = useMemo(() => {
    const map = new Map();
    
    if (!topics || topics.length === 0) return map;
    
    topics.forEach(topic => {
      if (topic.messageIds && topic.messageIds.length > 0) {
        topic.messageIds.forEach(messageId => {
          if (!map.has(messageId)) {
            map.set(messageId, []);
          }
          map.get(messageId).push({
            id: topic._id,
            label: topic.label
          });
        });
      }
    });
    
    return map;
  }, [topics]);
  
  // Get messages for the selected group
  const rawMessages = groupMessages[selectedGroup?._id] || [];
  
  // Deduplicate messages by ID and filter out thread replies
  const messages = useMemo(() => {
    const uniqueMessages = [];
    const messageIds = new Set();
    
    for (const message of rawMessages) {
      // Skip thread replies - they should only appear in the thread view
      if (message.isThreadReply) continue;
      
      if (!messageIds.has(message._id)) {
        messageIds.add(message._id);
        uniqueMessages.push(message);
      }
    }
    
    return uniqueMessages;
  }, [rawMessages]);
  
  // Get typing users for the selected group
  const groupTypingUsers = typingUsers[selectedGroup?._id] || {};
  const typingUserIds = Object.keys(groupTypingUsers).filter(id => id !== authUser?._id);
  
  // Find typing user names
  const typingUserNames = typingUserIds.map(userId => {
    const member = selectedGroup?.members?.find(m => m._id === userId);
    return member?.fullName || "Someone";
  });
  
  // Format typing indicator text
  const getTypingText = () => {
    if (typingUserNames.length === 0) return "";
    if (typingUserNames.length === 1) return `${typingUserNames[0]} is typing...`;
    if (typingUserNames.length === 2) return `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`;
    return "Several people are typing...";
  };
  
  useEffect(() => {
    if (selectedGroup) {
      subscribeToGroupMessages();
      subscribeToTopicEvents();
    }
    
    return () => {
      if (selectedGroup) {
        unsubscribeFromGroupMessages();
        unsubscribeFromTopicEvents();
      }
    };
  }, [selectedGroup?._id, subscribeToGroupMessages, unsubscribeFromGroupMessages, subscribeToTopicEvents, unsubscribeFromTopicEvents]);
  
  // Separate effect to fetch thread counts when messages change
  useEffect(() => {
    if (selectedGroup && messages.length > 0) {
      console.log('Fetching thread counts for', messages.length, 'messages');
      const fetchCounts = async () => {
        for (const message of messages) {
          await getThreadCount(message._id);
        }
      };
      fetchCounts();
    }
  }, [selectedGroup, messages, getThreadCount]);
  
  useEffect(() => {
    if (messageEndRef.current && messages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  const handleSendMessage = async (text, image) => {
    if (selectedGroup) {
      console.log('GroupChatContainer handleSendMessage:', { text, image: !!image });
      try {
          // Normal message
          await sendGroupMessage({ text, image });
      
      } catch (error) {
        console.error('Error sending group message:', error);
      }
    }
  };
  
  const handleTypingStart = () => {
    if (selectedGroup) {
      startTyping(selectedGroup._id);
    }
  };
  
  const handleTypingStop = () => {
    if (selectedGroup) {
      stopTyping(selectedGroup._id);
    }
  };
  
  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <GroupChatHeader />
        <div className="flex-1 overflow-y-auto">
          <MessageSkeleton />
        </div>
        <div className="mt-auto sticky bottom-0 bg-base-100 border-t border-base-300">
          <MessageInput 
            onSendMessage={handleSendMessage}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-1 h-full">
      <div className={`flex flex-col flex-1 ${(isTopicPanelOpen || isAISummaryOpen) ? 'w-2/3' : 'w-full'}`}>
        <GroupChatHeader onShowMembers={() => setShowMembersList(true)} />
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <p className="mb-2">No messages yet</p>
            <p className="text-sm">Be the first to send a message in this group!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId._id === authUser._id;
            const sender = isOwnMessage 
              ? authUser 
              : selectedGroup.members.find(member => member._id === message.senderId._id);
            
            return (
              <div
                key={message._id}
                className={`chat ${isOwnMessage ? "chat-end" : "chat-start"}`}
              >
                <div className="chat-image avatar">
                  <div className="size-10 rounded-full border">
                    <img
                      src={sender?.profilePic || "/avatar.png"}
                      alt={sender?.fullName || "User"}
                    />
                  </div>
                </div>
                <div className="chat-header mb-1">
                  {!isOwnMessage && (
                    <span className="font-medium mr-2">{sender?.fullName}</span>
                  )}
                  <time className="text-xs opacity-50">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </div>
                <div className="chat-bubble flex flex-col">
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md mb-2"
                    />
                  )}
                  {message.text && <p>{message.text}</p>}
                </div>
                <div className="chat-footer opacity-50 text-xs mt-1 flex flex-col gap-1">
                  {/* Topic badges */}
                  {messageTopicsMap.has(message._id) && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {messageTopicsMap.get(message._id).map(topic => (
                        <span 
                          key={topic.id}
                          className="badge badge-sm badge-primary cursor-pointer"
                          onClick={() => {
                            const fullTopic = topics.find(t => t._id === topic.id);
                            if (fullTopic) {
                              useTopicStore.getState().setSelectedTopic(fullTopic);
                              useTopicStore.getState().openTopicPanel();
                            }
                          }}
                        >
                          {topic.label}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Thread reply button */}
                  <button 
                    onClick={() => useGroupChatStore.getState().openThread(message)}
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
        
        {/* Typing indicator */}
        {typingUserNames.length > 0 && (
          <div className="text-sm text-gray-500 italic">
            {getTypingText()}
          </div>
        )}
        
        {/* Scroll to bottom reference */}
        <div ref={messageEndRef} />
      </div>
      
      <div className="mt-auto sticky bottom-0 bg-base-100 border-t border-base-300">
        <MessageInput 
          onSendMessage={handleSendMessage}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
        />
      </div>
      </div>
      
      {/* Side Panels - only show when AI summary is not open */}
      {isTopicPanelOpen && !isAISummaryOpen && (
        selectedTopic ? (
          <TopicMessageView />
        ) : (
          <TopicPanel onClose={closeTopicPanel} />
        )
      )}
      
      {/* Group members list modal */}
      <GroupMembersList 
        isOpen={showMembersList} 
        onClose={() => setShowMembersList(false)} 
      />
    </div>
  );
};

export default GroupChatContainer;