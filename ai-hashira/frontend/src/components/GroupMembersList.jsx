import { useState } from "react";
import { UserPlus, UserMinus, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useGroupChatStore } from "../store/useGroupChatStore";

const GroupMembersList = ({ isOpen, onClose }) => {
  const { selectedGroup, addMembersToGroup, removeMemberFromGroup } = useGroupChatStore();
  const { users, getUsers } = useChatStore();
  const { authUser } = useAuthStore();
  
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const isGroupCreator = selectedGroup?.creatorId?._id === authUser?._id;
  
  // Get users who are not already members of the group
  const nonMemberUsers = users.filter(
    user => !selectedGroup?.members?.some(member => member._id === user._id)
  );
  
  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsLoading(true);
    try {
      await addMembersToGroup(selectedGroup._id, selectedUsers);
      setSelectedUsers([]);
      setShowAddMembers(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveMember = async (memberId) => {
    if (!isGroupCreator) return;
    
    setIsLoading(true);
    try {
      await removeMemberFromGroup(selectedGroup._id, memberId);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };
  
  if (!isOpen || !selectedGroup) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Group Members</h3>
          <button 
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Group info */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b">
          <div className="avatar">
            <div className="size-12 bg-primary text-primary-content rounded-full flex items-center justify-center">
              {selectedGroup.groupPic ? (
                <img 
                  src={selectedGroup.groupPic} 
                  alt={selectedGroup.name} 
                  className="size-12 rounded-full"
                />
              ) : (
                <span className="text-xl font-bold">
                  {selectedGroup.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium">{selectedGroup.name}</h4>
            <p className="text-sm text-base-content/70">
              {selectedGroup.members.length} members
            </p>
          </div>
        </div>
        
        {/* Members list */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Members</h4>
            {isGroupCreator && (
              <button 
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setShowAddMembers(!showAddMembers);
                  if (!showAddMembers) {
                    getUsers();
                  }
                }}
              >
                <UserPlus size={16} />
                Add Members
              </button>
            )}
          </div>
          
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {selectedGroup.members.map(member => (
              <li key={member._id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="avatar">
                    <div className="size-8 rounded-full">
                      <img src={member.profilePic || "/avatar.png"} alt={member.fullName} />
                    </div>
                  </div>
                  <span>{member.fullName}</span>
                  {member._id === selectedGroup.creatorId._id && (
                    <span className="badge badge-warning badge-sm">Admin</span>
                  )}
                </div>
                
                {isGroupCreator && member._id !== authUser._id && member._id !== selectedGroup.creatorId._id && (
                  <button 
                    className="btn btn-ghost btn-sm btn-circle text-error"
                    onClick={() => handleRemoveMember(member._id)}
                    disabled={isLoading}
                  >
                    <UserMinus size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Add members section */}
        {showAddMembers && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Add New Members</h4>
            
            {nonMemberUsers.length === 0 ? (
              <p className="text-center text-gray-500 my-4">No users available to add</p>
            ) : (
              <>
                <div className="max-h-40 overflow-y-auto mb-4">
                  {nonMemberUsers.map(user => (
                    <div key={user._id} className="form-control">
                      <label className="cursor-pointer label justify-start gap-4">
                        <input 
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={selectedUsers.includes(user._id)}
                          onChange={() => toggleUserSelection(user._id)}
                        />
                        <div className="avatar">
                          <div className="w-8 rounded-full">
                            <img src={user.profilePic || "/avatar.png"} alt={user.fullName} />
                          </div>
                        </div>
                        <span className="label-text">{user.fullName}</span>
                      </label>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end">
                  <button 
                    className="btn btn-primary"
                    onClick={handleAddMembers}
                    disabled={selectedUsers.length === 0 || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Adding...
                      </>
                    ) : (
                      "Add Selected Members"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMembersList;