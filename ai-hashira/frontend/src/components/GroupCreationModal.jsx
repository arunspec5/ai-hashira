import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useGroupChatStore } from "../store/useGroupChatStore";

const GroupCreationModal = ({ isOpen, onClose }) => {
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const { authUser } = useAuthStore();
  const { users, getUsers, isUsersLoading } = useChatStore();
  const { createGroup, isCreatingGroup } = useGroupChatStore();

  // useEffect(() => {
  //   if (isOpen) {
  //     getUsers();
  //     setGroupName("");
  //     setSelectedUsers([]);
  //   }
  // }, [isOpen]); // Remove getUsers from the dependency array

  const handleCreateGroup = async () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      const success = await createGroup({
        name: groupName,
        members: [...selectedUsers, authUser._id]
      });

      if (success) {
        onClose();
      }
    }
  };

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 w-full max-w-md">
        <h3 className="font-bold text-lg mb-4">Create New Group</h3>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Group Name</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
          />
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Select Members</span>
          </label>

          {isUsersLoading ? (
            <div className="flex justify-center my-4">
              <span className="loading loading-spinner"></span>
              <span className="ml-2">Loading users...</span>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-60">
              {users.length === 0 ? (
                <p className="text-center text-gray-500 my-4">No users available</p>
              ) : (
                users.map(user => (
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
                ))
              )}
            </div>
          )}
        </div>

        <div className="modal-action">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isCreatingGroup}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedUsers.length === 0 || isCreatingGroup}
          >
            {isCreatingGroup ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Creating...
              </>
            ) : (
              "Create Group"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupCreationModal;