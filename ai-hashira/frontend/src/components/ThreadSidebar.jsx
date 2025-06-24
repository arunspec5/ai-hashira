import { useEffect, useRef, useState } from "react";
import { useGroupChatStore } from "../store/useGroupChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { X, Send, Sparkles } from "lucide-react";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import AISummaryPanel from "./AISummaryPanel";

const ThreadSidebar = () => {
  const { 
    selectedThreadParent, 
    threadMessages, 
    isThreadMessagesLoading, 
    closeThread,
    selectedGroup,
    sendThreadReply,
    toggleAISummary,
    isAISummaryOpen,
    summaryMode
  } = useGroupChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (messageEndRef.current && threadMessages[selectedThreadParent?._id]) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadMessages, selectedThreadParent]);

  if (!selectedThreadParent) return null;

  const messages = threadMessages[selectedThreadParent._id] || [];

  return (
    <div className="w-80 border-l border-base-300 flex flex-col h-full relative">
      {/* Thread Header */}
      <div className="p-4 border-b border-base-300 flex justify-between items-center">
        <h3 className="font-semibold">Thread</h3>
        <div className="flex items-center gap-2">
          {/* AI Summary button */}
          <button 
            className={`btn btn-ghost btn-sm btn-circle ${isAISummaryOpen && summaryMode === "thread" ? 'text-primary' : ''}`}
            title="Thread AI Summary"
            onClick={() => toggleAISummary("thread")}
          >
            <Sparkles size={18} />
          </button>
          <button 
            onClick={closeThread}
            className="btn btn-sm btn-ghost btn-circle"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Original Message */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-start gap-2 mb-2">
          <div className="avatar">
            <div className="size-8 rounded-full border">
              <img
                src={
                  selectedThreadParent.senderId === authUser._id
                    ? authUser.profilePic || "/avatar.png"
                    : typeof selectedThreadParent.senderId === 'object' && selectedThreadParent.senderId.profilePic
                      ? selectedThreadParent.senderId.profilePic
                      : selectedGroup.members.find(m => 
                          m._id === (typeof selectedThreadParent.senderId === 'object' ? selectedThreadParent.senderId._id : selectedThreadParent.senderId)
                        )?.profilePic || "/avatar.png"
                }
                alt="profile pic"
              />
            </div>
          </div>
          <div>
            <div className="font-medium">
              {selectedThreadParent.senderId === authUser._id
                ? "You"
                : typeof selectedThreadParent.senderId === 'object' && selectedThreadParent.senderId.fullName
                  ? selectedThreadParent.senderId.fullName
                  : selectedGroup.members.find(m => 
                      m._id === (typeof selectedThreadParent.senderId === 'object' ? selectedThreadParent.senderId._id : selectedThreadParent.senderId)
                    )?.fullName || 
                    selectedGroup.members.find(m => 
                      m._id === (typeof selectedThreadParent.senderId === 'object' ? selectedThreadParent.senderId._id : selectedThreadParent.senderId)
                    )?.username || "User"}
            </div>
            <div className="text-xs text-base-content/60">
              {formatMessageTime(selectedThreadParent.createdAt)}
            </div>
          </div>
        </div>
        <div className="ml-10">
          {selectedThreadParent.image && (
            <img
              src={selectedThreadParent.image}
              alt="Attachment"
              className="max-w-[200px] rounded-md mb-2"
            />
          )}
          {selectedThreadParent.text && <p>{selectedThreadParent.text}</p>}
        </div>
      </div>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isThreadMessagesLoading ? (
          <MessageSkeleton />
        ) : messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message._id}
              className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-image avatar">
                <div className="size-8 rounded-full border">
                  <img
                    src={
                      message.senderId === authUser._id
                        ? authUser.profilePic || "/avatar.png"
                        : typeof message.senderId === 'object' && message.senderId.profilePic
                          ? message.senderId.profilePic
                          : selectedGroup.members.find(m => 
                              m._id === (typeof message.senderId === 'object' ? message.senderId._id : message.senderId)
                            )?.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>
              <div className="chat-header mb-1">
                <span className="font-medium mr-2">
                  {message.senderId === authUser._id
                    ? "You"
                    : typeof message.senderId === 'object' && message.senderId.fullName
                      ? message.senderId.fullName
                      : selectedGroup.members.find(m => 
                          m._id === (typeof message.senderId === 'object' ? message.senderId._id : message.senderId)
                        )?.fullName || 
                        selectedGroup.members.find(m => 
                          m._id === (typeof message.senderId === 'object' ? message.senderId._id : message.senderId)
                        )?.username || "User"}
                </span>
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
              <div className="chat-bubble flex flex-col">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="max-w-[150px] rounded-md mb-2"
                  />
                )}
                {message.text && <p>{message.text}</p>}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <p className="mb-2">No replies yet</p>
            <p className="text-sm">Be the first to reply to this message!</p>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>
      
      {/* We don't need to render AISummaryPanel here anymore as it will be rendered in HomePage */}
      
      {/* Thread Reply Input */}
      <div className="mt-auto sticky bottom-0 bg-base-100 border-t border-base-300 p-3">
        <div className="text-sm font-medium mb-2">Reply to this thread</div>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!replyText.trim()) return;
          
          setIsSending(true);
          sendThreadReply({ text: replyText.trim() })
            .then(() => {
              setReplyText("");
            })
            .finally(() => {
              setIsSending(false);
            });
        }} className="flex gap-2">
          <input
            type="text"
            className="input input-bordered input-sm flex-1"
            placeholder="Type your reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={isSending}
          />
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={!replyText.trim() || isSending}
          >
            {isSending ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ThreadSidebar;