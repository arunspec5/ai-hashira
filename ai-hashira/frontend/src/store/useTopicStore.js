import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useGroupChatStore } from "./useGroupChatStore";

export const useTopicStore = create((set, get) => ({
  topics: [],
  selectedTopic: null,
  topicMessages: {},
  isTopicsLoading: false,
  isMessagesLoading: false,
  isTopicPanelOpen: false,
  
  // Topic settings
  topicSettings: {
    enabled: true,
    minMessages: 5,
    timeThreshold: 60
  },
  isSettingsLoading: false,
  
  // Open/close topic panel
  openTopicPanel: () => {
    set({ isTopicPanelOpen: true });
    const { selectedGroup } = useGroupChatStore.getState();
    if (selectedGroup) {
      get().getTopics(selectedGroup._id);
    }
  },
  
  closeTopicPanel: () => {
    set({ 
      isTopicPanelOpen: false,
      selectedTopic: null
    });
  },
  
  // Get topics for a group
  getTopics: async (groupId) => {
    if (!groupId) return;
    
    set({ isTopicsLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/topics`);
      set({ 
        topics: res.data,
        isTopicsLoading: false 
      });
      return res.data;
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error(error.response?.data?.message || 'Failed to load topics');
      set({ 
        topics: [],
        isTopicsLoading: false 
      });
      return [];
    }
  },
  
  // Generate topics for a group
  generateTopics: async (groupId, options = {}) => {
    if (!groupId) return;
    
    set({ isTopicsLoading: true });
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/topics`, options);
      set({ 
        topics: res.data,
        isTopicsLoading: false 
      });
      toast.success('Topics generated successfully');
      return res.data;
    } catch (error) {
      console.error('Error generating topics:', error);
      toast.error(error.response?.data?.message || 'Failed to generate topics');
      set({ isTopicsLoading: false });
      return null;
    }
  },
  
  // Set selected topic and fetch its messages
  setSelectedTopic: (topic) => {
    set({ selectedTopic: topic });
    if (topic) {
      get().getTopicMessages(topic.groupId, topic._id);
    }
  },
  
  // Clear selected topic
  clearSelectedTopic: () => {
    set({ selectedTopic: null });
  },
  
  // Get messages for a specific topic
  getTopicMessages: async (groupId, topicId) => {
    if (!groupId || !topicId) return;
    
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/topics/${topicId}/messages`);
      set(state => ({
        topicMessages: {
          ...state.topicMessages,
          [topicId]: res.data
        },
        isMessagesLoading: false
      }));
      return res.data;
    } catch (error) {
      console.error('Error fetching topic messages:', error);
      toast.error(error.response?.data?.message || 'Failed to load topic messages');
      set({ isMessagesLoading: false });
      return [];
    }
  },
  
  // Get topic settings for a group
  getTopicSettings: async (groupId) => {
    if (!groupId) return;
    
    set({ isSettingsLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/settings/topics`);
      set({ 
        topicSettings: res.data,
        isSettingsLoading: false 
      });
      return res.data;
    } catch (error) {
      console.error('Error fetching topic settings:', error);
      // Don't show error toast for settings fetch
      set({ isSettingsLoading: false });
      return get().topicSettings; // Return default settings on error
    }
  },
  
  // Update topic settings for a group
  updateTopicSettings: async (groupId, settings) => {
    if (!groupId) return;
    
    set({ isSettingsLoading: true });
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/settings/topics`, settings);
      set({ 
        topicSettings: res.data,
        isSettingsLoading: false 
      });
      toast.success('Topic settings updated successfully');
      
      // If topics are disabled, clear topics
      if (settings.enabled === false) {
        set({ topics: [] });
      } else {
        // If topics are enabled, refresh topics
        get().getTopics(groupId);
      }
      
      return res.data;
    } catch (error) {
      console.error('Error updating topic settings:', error);
      toast.error(error.response?.data?.message || 'Failed to update topic settings');
      set({ isSettingsLoading: false });
      return null;
    }
  },
  
  // Handle new message for topic classification
  handleNewMessage: (message) => {
    const { selectedTopic } = get();
    const { selectedGroup } = useGroupChatStore.getState();
    
    if (!selectedGroup || !message.groupId || message.groupId !== selectedGroup._id) return;
    
    // If a topic is selected, check if the new message belongs to this topic
    // This would require server-side logic to classify the message in real-time
    // For now, we'll just refresh topics when new messages come in
    setTimeout(() => {
      get().getTopics(selectedGroup._id);
      
      // If a topic is selected, refresh its messages
      if (selectedTopic) {
        get().getTopicMessages(selectedTopic.groupId, selectedTopic._id);
      }
    }, 1000); // Delay to allow server-side classification
  },
  
  // Update a message in topic messages if it exists
  updateTopicMessage: (messageId, updatedData) => {
    const { topicMessages, selectedTopic } = get();
    
    if (!selectedTopic) return;
    
    const topicId = selectedTopic._id;
    const messages = topicMessages[topicId] || [];
    
    // Check if the message exists in this topic
    const messageIndex = messages.findIndex(msg => msg._id === messageId);
    if (messageIndex === -1) return;
    
    // Update the message
    set(state => {
      const updatedMessages = [...state.topicMessages[topicId]];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        ...updatedData
      };
      
      return {
        topicMessages: {
          ...state.topicMessages,
          [topicId]: updatedMessages
        }
      };
    });
  },
  
  // Remove a message from topic messages if it exists
  removeTopicMessage: (messageId) => {
    const { topicMessages, selectedTopic } = get();
    
    if (!selectedTopic) return;
    
    const topicId = selectedTopic._id;
    const messages = topicMessages[topicId] || [];
    
    // Check if the message exists in this topic
    if (!messages.some(msg => msg._id === messageId)) return;
    
    // Remove the message
    set(state => {
      return {
        topicMessages: {
          ...state.topicMessages,
          [topicId]: state.topicMessages[topicId].filter(msg => msg._id !== messageId)
        }
      };
    });
  },
  
  // Handle topic updates from socket
  handleTopicsUpdated: ({ groupId, topics }) => {
    const { selectedGroup } = useGroupChatStore.getState();
    if (!selectedGroup || groupId !== selectedGroup._id) return;
    
    set({ topics });
  },
  
  // Handle new topic message from socket
  handleTopicMessageAdded: ({ groupId, topicId, message }) => {
    const { selectedTopic } = get();
    if (!selectedTopic || topicId !== selectedTopic._id) return;
    
    set(state => {
      const currentMessages = state.topicMessages[topicId] || [];
      
      // Check if message already exists
      if (currentMessages.some(m => m._id === message._id)) {
        return state;
      }
      
      return {
        topicMessages: {
          ...state.topicMessages,
          [topicId]: [...currentMessages, message]
        }
      };
    });
  },
  
  // Handle message updates (reactions, edits, etc.)
  handleMessageUpdated: (updatedMessage) => {
    const { selectedTopic } = get();
    if (!selectedTopic) return;
    
    // Update the message if it exists in the current topic
    get().updateTopicMessage(updatedMessage._id, updatedMessage);
  },
  
  // Handle message deletions
  handleMessageDeleted: ({ messageId }) => {
    const { selectedTopic } = get();
    if (!selectedTopic) return;
    
    // Remove the message if it exists in the current topic
    get().removeTopicMessage(messageId);
  },
  
  // Subscribe to socket events
  subscribeToTopicEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    // Subscribe to group message events to update topics
    socket.on("newGroupMessage", get().handleNewMessage);
    socket.on("messageUpdated", get().handleMessageUpdated);
    socket.on("messageDeleted", get().handleMessageDeleted);
    
    // Subscribe to topic-specific events
    socket.on("topicsUpdated", get().handleTopicsUpdated);
    socket.on("topicMessageAdded", get().handleTopicMessageAdded);
  },
  
  // Unsubscribe from socket events
  unsubscribeFromTopicEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    socket.off("newGroupMessage", get().handleNewMessage);
    socket.off("messageUpdated", get().handleMessageUpdated);
    socket.off("messageDeleted", get().handleMessageDeleted);
    socket.off("topicsUpdated");
    socket.off("topicMessageAdded");
  },
  
  // Clear all topic data
  clearTopics: () => {
    set({
      topics: [],
      selectedTopic: null,
      topicMessages: {},
      isTopicPanelOpen: false
    });
  }
}));

export default useTopicStore;