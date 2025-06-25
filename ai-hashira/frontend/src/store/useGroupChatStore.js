import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useTopicStore } from "./useTopicStore";

export const useGroupChatStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: {},
  threadMessages: {},
  selectedThreadParent: null,
  isThreadOpen: false,
  isAISummaryOpen: false,
  summaryMode: "group", // Can be "group" or "thread"
  typingUsers: {},
  isGroupsLoading: false,
  isMessagesLoading: false,
  isThreadMessagesLoading: false,
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
      // Just send the message but don't add it to the state
      // It will be added when it comes back through the socket
      const res = await axiosInstance.post(`/groups/${selectedGroup._id}/messages`, messageData);
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  handleNewGroupMessage: (message) => {
    const { selectedGroup } = get();
    if (!selectedGroup || !message.groupId) return;

    // Skip thread replies - they should be handled by handleNewThreadMessage
    if (message.isThreadReply) return;

    if (message.groupId === selectedGroup._id) {
      // Add the message from the socket
      set(state => {
        const currentMessages = state.groupMessages[selectedGroup._id] || [];
        
        // Check if this message already exists in the state
        const messageExists = currentMessages.some(m => m._id === message._id);
        
        // Only add the message if it doesn't already exist
        if (!messageExists) {
          // Initialize thread count for this new message
          setTimeout(() => {
            get().getThreadCount(message._id);
          }, 500); // Small delay to ensure message is saved
          
          return {
            groupMessages: {
              ...state.groupMessages,
              [selectedGroup._id]: [...currentMessages, message]
            }
          };
        }
        
        // Return unchanged state if message already exists
        return state;
      });
    }
  },

  subscribeToGroupMessages: () => {
    const { selectedGroup } = get();
    if (!selectedGroup) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    console.log("Subscribing to group messages and thread messages");
    socket.on("newGroupMessage", get().handleNewGroupMessage);
    socket.on("newThreadMessage", get().handleNewThreadMessage);
  },

  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newGroupMessage");
    socket.off("newThreadMessage");
  },

  // Thread functionality
  openThread: (parentMessage) => {
    console.log("Opening thread for message:", parentMessage);
    set({ 
      selectedThreadParent: parentMessage,
      isThreadOpen: true 
    });
    get().getThreadMessages(parentMessage._id);
    get().getThreadCount(parentMessage._id);
  },

  closeThread: () => {
    set({ 
      selectedThreadParent: null,
      isThreadOpen: false,
      // If summary is open and in thread mode, close it
      isAISummaryOpen: get().isAISummaryOpen && get().summaryMode === "thread" ? false : get().isAISummaryOpen
    });
  },

  // AI Summary functionality
  toggleAISummary: (mode = "group") => {
    // Get current state
    const currentIsOpen = get().isAISummaryOpen;
    const currentMode = get().summaryMode;
    
    // Close topic panel if open
    const topicStore = useTopicStore.getState();
    if (topicStore && topicStore.isTopicPanelOpen) {
      topicStore.closeTopicPanel();
    }
    
    // If already open with same mode, close it
    if (currentIsOpen && currentMode === mode) {
      set({ isAISummaryOpen: false });
      return;
    }
    
    // Otherwise open it with the specified mode
    set({
      isAISummaryOpen: true,
      summaryMode: mode
    });
  },
  
  openAISummary: (mode = "group") => {
    // Close topic panel if open
    const topicStore = useTopicStore.getState();
    if (topicStore && topicStore.isTopicPanelOpen) {
      topicStore.closeTopicPanel();
    }
    
    // Always open the summary panel
    set({
      isAISummaryOpen: true,
      summaryMode: mode
    });
  },

  closeAISummary: () => {
    set({ isAISummaryOpen: false });
  },
  
  setSummaryMode: (mode) => {
    set({ summaryMode: mode });
  },
  
  summaryPreferences: {
    timeRange: "all",
    topics: [],
    detailLevel: "moderate"
  },
  
  getSummaryPreferences: async () => {
    try {
      const res = await axiosInstance.get("/users/summary-preferences");
      set({ summaryPreferences: res.data });
      return res.data;
    } catch (error) {
      console.error("Failed to fetch summary preferences:", error);
      return get().summaryPreferences; // Return current preferences on error
    }
  },
  
  updateSummaryPreferences: async (preferences) => {
    try {
      const res = await axiosInstance.put("/users/summary-preferences", preferences);
      set({ summaryPreferences: res.data });
      return res.data;
    } catch (error) {
      console.error("Failed to update summary preferences:", error);
      return null;
    }
  },

  threadCounts: {},

  getThreadCount: async (messageId) => {
    try {
      console.log(`Fetching thread count for message ${messageId}`);
      
      // Always fetch the latest count from the API
      const res = await axiosInstance.get(`/threads/${messageId}/count`);
      
      console.log(`Thread count for message ${messageId}:`, res.data.count);
      
      // Update the thread counts in the store
      set(state => ({
        threadCounts: {
          ...state.threadCounts,
          [messageId]: res.data.count
        }
      }));
      
      return res.data.count;
    } catch (error) {
      console.error(`Error fetching thread count for message ${messageId}:`, error);
      return 0;
    }
  },

  getThreadMessages: async (parentId) => {
    set({ isThreadMessagesLoading: true });
    try {
      console.log("Fetching thread messages for parentId:", parentId);
      
      // First try to get any existing thread messages from the store
      const existingMessages = get().threadMessages[parentId] || [];
      if (existingMessages.length > 0) {
        console.log("Using existing thread messages from store");
        return;
      }
      
      // If no messages in store, fetch from API - fix the API endpoint
      const res = await axiosInstance.get(`/threads/${parentId}`);
      console.log("Thread messages response:", res.data);
      
      set(state => ({
        threadMessages: {
          ...state.threadMessages,
          [parentId]: res.data
        }
      }));
    } catch (error) {
      console.error("Error fetching thread messages:", error);
      // Initialize with empty array to prevent repeated failed API calls
      set(state => ({
        threadMessages: {
          ...state.threadMessages,
          [parentId]: []
        }
      }));
      toast.error("Could not load thread messages");
    } finally {
      set({ isThreadMessagesLoading: false });
    }
  },

  sendThreadReply: async (messageData) => {
    const { selectedThreadParent, selectedGroup } = get();
    if (!selectedThreadParent || !selectedGroup) return;

    try {
      const threadData = {
        ...messageData,
        parentId: selectedThreadParent._id,
        isThreadReply: true
      };
      
      console.log("Sending thread reply:", threadData);
      // Fix the API endpoint - remove the /api prefix
      const res = await axiosInstance.post(`/groups/${selectedGroup._id}/messages`, threadData);
      console.log("Thread reply response:", res.data);
      
      // Update the thread count
      set(state => ({
        threadCounts: {
          ...state.threadCounts,
          [selectedThreadParent._id]: (state.threadCounts[selectedThreadParent._id] || 0) + 1
        }
      }));
      
      // Don't add to thread messages here, it will be added when it comes back through the socket
      
      return res.data;
    } catch (error) {
      console.error("Error sending thread reply:", error);
      toast.error(error.response?.data?.message || "Failed to send reply");
    }
  },

  handleNewThreadMessage: (message) => {
    const { selectedThreadParent } = get();
    if (!message.parentId) return;

    console.log("Received thread message:", JSON.stringify(message, null, 2));

    // Update the thread count for this parent message
    set(state => ({
      threadCounts: {
        ...state.threadCounts,
        [message.parentId]: (state.threadCounts[message.parentId] || 0) + 1
      }
    }));

    // If we have the thread open for this parent message, add the new message to the thread
    if (selectedThreadParent && message.parentId === selectedThreadParent._id) {
      console.log("Adding message to thread:", message);
      set(state => {
        const currentThreadMessages = state.threadMessages[selectedThreadParent._id] || [];
        
        // Check if this message already exists in the thread
        const messageExists = currentThreadMessages.some(m => m._id === message._id);
        
        // Only add the message if it doesn't already exist
        if (!messageExists) {
          return {
            threadMessages: {
              ...state.threadMessages,
              [selectedThreadParent._id]: [...currentThreadMessages, message]
            }
          };
        }
        
        // Return unchanged state if message already exists
        return state;
      });
    } else if (message.parentId) {
      // Even if the thread isn't open, store the message for when it is opened
      console.log("Storing thread message for later:", message);
      set(state => {
        const currentThreadMessages = state.threadMessages[message.parentId] || [];
        
        // Check if this message already exists in the thread
        const messageExists = currentThreadMessages.some(m => m._id === message._id);
        
        // Only add the message if it doesn't already exist
        if (!messageExists) {
          return {
            threadMessages: {
              ...state.threadMessages,
              [message.parentId]: [...currentThreadMessages, message]
            }
          };
        }
        
        // Return unchanged state if message already exists
        return state;
      });
    }
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