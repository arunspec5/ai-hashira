import { useEffect, useRef, useState } from "react";
import { useGroupChatStore } from "../store/useGroupChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { MessageCircleReply } from "lucide-react";

import GroupChatHeader from "./GroupChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import GroupMembersList from "./GroupMembersList";

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
    typingUsers
  } = useGroupChatStore();
  
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [showMembersList, setShowMembersList] = useState(false);
  
  // Get messages for the selected group
  const messages = groupMessages[selectedGroup?._id] || [];
  
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
    }
    
    return () => {
      if (selectedGroup) {
        unsubscribeFromGroupMessages();
      }
    };
  }, [selectedGroup?._id, subscribeToGroupMessages, unsubscribeFromGroupMessages]);
  
  useEffect(() => {
    if (messageEndRef.current && messages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  const handleSendMessage = async (text, image) => {
    if (selectedGroup) {
      console.log('GroupChatContainer handleSendMessage:', { text, image: !!image });
      try {
        // Check if we're replying to a thread
        const { selectedThreadParent } = useGroupChatStore.getState();
        if (selectedThreadParent) {
          // This is a thread reply
          await sendGroupMessage({ 
            text, 
            image, 
            parentId: selectedThreadParent._id,
            isThreadReply: true 
          });
        } else {
          // Normal message
          await sendGroupMessage({ text, image });
        }
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
    <div className="flex-1 flex flex-col h-full">
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
                <div className="chat-footer opacity-50 text-xs mt-1">
                  <button 
                    onClick={() => useGroupChatStore.getState().openThread(message)}
                    className="hover:underline flex items-center gap-1"
                  >
                    <MessageCircleReply size={14} />
                    Reply
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
      
      {/* Group members list modal */}
      <GroupMembersList 
        isOpen={showMembersList} 
        onClose={() => setShowMembersList(false)} 
      />
    </div>
  );
};

export default GroupChatContainer;