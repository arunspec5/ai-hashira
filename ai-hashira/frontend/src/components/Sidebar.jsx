import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupChatStore } from "../store/useGroupChatStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, UserPlus, MessageSquare, Plus } from "lucide-react";
import GroupCreationModal from "./GroupCreationModal";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { 
    groups, 
    getGroups, 
    selectedGroup, 
    setSelectedGroup, 
    isGroupsLoading 
  } = useGroupChatStore();
  const { onlineUsers = [], authUser } = useAuthStore();
  
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("users"); // "users" or "groups"
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  // Ensure users is always an array, even if API call fails
  const safeUsers = Array.isArray(users) ? users : [];
  
  const filteredUsers = showOnlineOnly
    ? safeUsers.filter((user) => onlineUsers && onlineUsers.includes(user._id))
    : safeUsers;

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSelectedGroup(null);
    setActiveTab("users");
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setActiveTab("groups");
  };

  const isLoading = isUsersLoading || isGroupsLoading;
  if (isLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        {/* Tabs */}
        <div className="tabs tabs-boxed">
          <button 
            className={`tab ${activeTab === "users" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <Users className="size-4 mr-1" />
            <span className="hidden lg:inline">Users</span>
          </button>
          <button 
            className={`tab ${activeTab === "groups" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("groups")}
          >
            <MessageSquare className="size-4 mr-1" />
            <span className="hidden lg:inline">Groups</span>
          </button>
        </div>

        {/* Filter for users tab */}
        {activeTab === "users" && (
          <div className="mt-3 hidden lg:flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online only</span>
            </label>
            <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
          </div>
        )}

        {/* Create group button for groups tab */}
        {activeTab === "groups" && (
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium hidden lg:block">Your Groups</span>
            <button 
              className="btn btn-sm btn-primary"
              onClick={() => setShowGroupModal(true)}
            >
              <Plus className="size-4" />
              <span className="hidden lg:inline">New Group</span>
            </button>
          </div>
        )}
      </div>

      {/* Users list */}
      {activeTab === "users" && (
        <div className="overflow-y-auto w-full py-3">
          {filteredUsers.map((user) => (
            <button
              key={user._id}
              onClick={() => handleUserSelect(user)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className="size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                    rounded-full ring-2 ring-zinc-900"
                  />
                )}
              </div>

              {/* User info - only visible on larger screens */}
              <div className="hidden lg:block text-left min-w-0">
                <div className="font-medium truncate">{user.fullName}</div>
                <div className="text-sm text-zinc-400">
                  {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                </div>
              </div>
            </button>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center text-zinc-500 py-4">
              {showOnlineOnly ? "No online users" : "No users found"}
            </div>
          )}
        </div>
      )}

      {/* Groups list */}
      {activeTab === "groups" && (
        <div className="overflow-y-auto w-full py-3">
          {Array.isArray(groups) && groups.map((group) => (
            <button
              key={group._id}
              onClick={() => handleGroupSelect(group)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <div className="size-12 bg-primary text-primary-content rounded-full flex items-center justify-center">
                  {group.groupPic ? (
                    <img
                      src={group.groupPic}
                      alt={group.name}
                      className="size-12 object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-xl font-bold">
                      {group.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {group.creatorId._id === authUser._id && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-yellow-500 
                    rounded-full ring-2 ring-zinc-900"
                    title="You are the group admin"
                  />
                )}
              </div>

              {/* Group info - only visible on larger screens */}
              <div className="hidden lg:block text-left min-w-0">
                <div className="font-medium truncate">{group.name}</div>
                <div className="text-sm text-zinc-400">
                  {group.members.length} members
                </div>
              </div>
            </button>
          ))}

          {groups.length === 0 && (
            <div className="text-center text-zinc-500 py-4">
              <p>No groups yet</p>
              <button 
                className="btn btn-sm btn-primary mt-2"
                onClick={() => setShowGroupModal(true)}
              >
                <UserPlus className="size-4 mr-1" />
                Create a group
              </button>
            </div>
          )}
        </div>
      )}

      {/* Group creation modal */}
      <GroupCreationModal 
        isOpen={showGroupModal} 
        onClose={() => setShowGroupModal(false)} 
      />
    </aside>
  );
};

export default Sidebar;