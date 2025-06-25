import { useState } from "react";
import { X, Users, Settings, Info, Sparkles, MessageSquare } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupChatStore } from "../store/useGroupChatStore";
import { useTopicStore } from "../store/useTopicStore";
import GroupSettingsModal from "./GroupSettingsModal";

const GroupChatHeader = ({ onShowMembers }) => {
  const { selectedGroup, setSelectedGroup, toggleAISummary, openAISummary, isAISummaryOpen, summaryMode } = useGroupChatStore();
  const { authUser } = useAuthStore();
  const { isTopicPanelOpen, openTopicPanel, closeTopicPanel } = useTopicStore();
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const isGroupCreator = selectedGroup?.creatorId?._id === authUser?._id;
  
  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {/* Group Avatar */}
          <div className="avatar">
            <div className="size-10 bg-primary text-primary-content rounded-full flex items-center justify-center">
              {selectedGroup?.groupPic ? (
                <img 
                  src={selectedGroup.groupPic} 
                  alt={selectedGroup.name} 
                  className="size-10 rounded-full"
                />
              ) : (
                <span className="text-xl font-bold flex items-center justify-center w-full h-full">
                  {selectedGroup?.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Group info */}
          <div className="min-w-0 flex-1">
            <h3 className="font-medium truncate">{selectedGroup?.name}</h3>
            <button 
              className="text-sm text-base-content/70 flex items-center gap-1"
              onClick={() => setShowMembers(!showMembers)}
            >
              <Users size={14} />
              <span>{selectedGroup?.members?.length} members</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Group settings button (only for creator) */}
          {isGroupCreator && (
            <button 
              className="btn btn-ghost btn-sm btn-circle"
              title="Group settings"
              onClick={() => setShowSettings(true)}
            >
              <Settings size={18} />
            </button>
          )}
          
          {/* Topics button */}
          <button 
            className={`btn btn-ghost btn-sm btn-circle ${isTopicPanelOpen ? 'text-primary' : ''}`}
            title="Topics"
            onClick={() => isTopicPanelOpen ? closeTopicPanel() : openTopicPanel()}
          >
            <MessageSquare size={18} />
          </button>
          
          {/* AI Summary button */}
          <button 
            className={`btn btn-ghost btn-sm btn-circle ${isAISummaryOpen && summaryMode === "group" ? 'text-primary' : ''}`}
            title="Group AI Summary"
            onClick={() => {
              console.log('AI Summary button clicked');
              openAISummary("group");
              console.log('After open - isAISummaryOpen:', useGroupChatStore.getState().isAISummaryOpen);
            }}
          >
            <Sparkles size={18} />
          </button>
          
          {/* Group info button */}
          <button 
            className="btn btn-ghost btn-sm btn-circle"
            title="Group info"
            onClick={() => {
              if (onShowMembers) {
                onShowMembers();
              } else {
                setShowMembers(!showMembers);
              }
            }}
          >
            <Info size={18} />
          </button>
          
          {/* Close button */}
          <button 
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => setSelectedGroup(null)}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      {/* Members list dropdown */}
      {showMembers && (
        <div className="mt-2 p-2 bg-base-200 rounded-lg max-h-60 overflow-y-auto">
          <h4 className="font-medium text-sm mb-2">Group Members</h4>
          <ul className="space-y-2">
            {selectedGroup?.members?.map(member => (
              <li key={member._id} className="flex items-center gap-2">
                <div className="avatar">
                  <div className="size-6 rounded-full">
                    <img src={member.profilePic || "/avatar.png"} alt={member.fullName} />
                  </div>
                </div>
                <span className="text-sm">{member.fullName}</span>
                {member._id === selectedGroup.creatorId._id && (
                  <span className="badge badge-warning badge-sm">Admin</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )} 
     
      {/* Group settings modal */}
      <GroupSettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
};

export default GroupChatHeader;