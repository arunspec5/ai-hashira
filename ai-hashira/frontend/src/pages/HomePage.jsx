import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupChatStore } from "../store/useGroupChatStore";
import { useAuthStore } from "../store/useAuthStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import GroupChatContainer from "../components/GroupChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { selectedGroup, subscribeToGroupEvents, unsubscribeFromGroupEvents } = useGroupChatStore();
  const { socket } = useAuthStore();
  
  // Subscribe to group events when socket is available
  useEffect(() => {
    if (socket) {
      subscribeToGroupEvents();
    }
    
    return () => {
      if (socket) {
        unsubscribeFromGroupEvents();
      }
    };
  }, [socket, subscribeToGroupEvents, unsubscribeFromGroupEvents]);

  // Determine which chat container to show
  const renderChatContainer = () => {
    if (selectedUser) {
      return <ChatContainer />;
    }
    
    if (selectedGroup) {
      return <GroupChatContainer />;
    }
    
    return <NoChatSelected />;
  };

  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-[calc(100vh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar />
            {renderChatContainer()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;