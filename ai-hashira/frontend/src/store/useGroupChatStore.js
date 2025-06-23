import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useGroupChatStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: {},
  typingUsers: {},
  isGroupsLoading: false,
  isMessagesLoading: false,
  isCreatingGroup: false,

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async (groupData) => {
    set({ isCreatingGroup: true });
    try {
      const res = await axiosInstance.post("/groups", groupData);
      set(state => ({
        groups: [...state.groups, res.data],
      }));
      toast.success("Group created successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
    } finally {
      set({ isCreatingGroup: false });
    }
  },

  updateGroup: async (groupId, groupData) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, groupData);
      set(state => ({
        groups: state.groups.map(group =>
          group._id === groupId ? res.data : group
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup
      }));
      toast.success("Group updated successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);
      set(state => ({
        groups: state.groups.filter(group => group._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));
      toast.success("Group deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
    }
  },

  addMembersToGroup: async (groupId, members) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, { members });
      set(state => ({
        groups: state.groups.map(group =>
          group._id === groupId ? res.data : group
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup
      }));
      toast.success("Members added successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add members");
    }
  },

  removeMemberFromGroup: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}/members/${memberId}`);
      set(state => ({
        groups: state.groups.map(group =>
          group._id === groupId ? res.data : group
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup
      }));
      toast.success("Member removed successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}/leave`);
      set(state => ({
        groups: state.groups.filter(group => group._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));
      toast.success("Left group successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave group");
    }
  },

  setSelectedGroup: (group) => {
    set({ selectedGroup: group });

    if (group) {
      // Fetch messages for the selected group
      get().getGroupMessages(group._id);

      // Join the group's socket room
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("joinGroup", { groupId: group._id });
      }

      // Subscribe to group messages
      get().subscribeToGroupMessages();
    } else {
      // Unsubscribe from group messages when no group is selected
      get().unsubscribeFromGroupMessages();
    }
  },

  handleGroupCreated: (group) => {
    set(state => ({
      groups: [...state.groups, group]
    }));
  },

  handleGroupUpdated: (updatedGroup) => {
    set(state => ({
      groups: state.groups.map(group =>
        group._id === updatedGroup._id ? updatedGroup : group
      ),
      selectedGroup: state.selectedGroup?._id === updatedGroup._id ? updatedGroup : state.selectedGroup
    }));
  },

  handleGroupDeleted: ({ groupId }) => {
    set(state => ({
      groups: state.groups.filter(group => group._id !== groupId),
      selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
    }));
  },

  handleRemovedFromGroup: ({ groupId }) => {
    set(state => ({
      groups: state.groups.filter(group => group._id !== groupId),
      selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
    }));
  },

  subscribeToGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("groupCreated", get().handleGroupCreated);
    socket.on("groupUpdated", get().handleGroupUpdated);
    socket.on("groupDeleted", get().handleGroupDeleted);
    socket.on("removedFromGroup", get().handleRemovedFromGroup);
    socket.on("groupTyping", get().handleGroupTyping);
    socket.on("groupTypingStopped", get().handleGroupTypingStopped);
  },

  unsubscribeFromGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("groupCreated");
    socket.off("groupUpdated");
    socket.off("groupDeleted");
    socket.off("removedFromGroup");
    socket.off("groupTyping");
    socket.off("groupTypingStopped");
  },

  // Group messaging functionality
  getGroupMessages: async (groupId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set(state => ({
        groupMessages: {
          ...state.groupMessages,
          [groupId]: res.data
        }
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendGroupMessage: async (messageData) => {
    const { selectedGroup } = get();
    if (!selectedGroup) return;

    try {
      const res = await axiosInstance.post(`/groups/${selectedGroup._id}/messages`, messageData);
      set(state => ({
        groupMessages: {
          ...state.groupMessages,
          [selectedGroup._id]: [...(state.groupMessages[selectedGroup._id] || []), res.data]
        }
      }));
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  handleNewGroupMessage: (message) => {
    const { selectedGroup } = get();
    if (!selectedGroup || !message.groupId) return;

    if (message.groupId === selectedGroup._id) {
      set(state => ({
        groupMessages: {
          ...state.groupMessages,
          [selectedGroup._id]: [...(state.groupMessages[selectedGroup._id] || []), message]
        }
      }));
    }
  },

  subscribeToGroupMessages: () => {
    const { selectedGroup } = get();
    if (!selectedGroup) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newGroupMessage", get().handleNewGroupMessage);
  },

  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newGroupMessage");
  },

  // Typing indicator functionality
  startTyping: (groupId) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.emit("startTypingInGroup", { groupId });
  },

  stopTyping: (groupId) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.emit("stopTypingInGroup", { groupId });
  },

  handleGroupTyping: ({ groupId, userId }) => {
    if (!groupId || !userId) return;

    set(state => ({
      typingUsers: {
        ...state.typingUsers,
        [groupId]: {
          ...(state.typingUsers[groupId] || {}),
          [userId]: true
        }
      }
    }));
  },

  handleGroupTypingStopped: ({ groupId, userId }) => {
    if (!groupId || !userId) return;

    set(state => {
      const groupTypingUsers = { ...(state.typingUsers[groupId] || {}) };
      delete groupTypingUsers[userId];

      return {
        typingUsers: {
          ...state.typingUsers,
          [groupId]: groupTypingUsers
        }
      };
    });
  }
}));