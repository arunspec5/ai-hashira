import { useState, useEffect } from "react";
import { useGroupChatStore } from "../store/useGroupChatStore";
import { useTopicStore } from "../store/useTopicStore";
import { useAuthStore } from "../store/useAuthStore";

const TopicSettings = ({ onClose, onRefresh }) => {
  const { selectedGroup } = useGroupChatStore();
  const { topicSettings, updateTopicSettings, isSettingsLoading } = useTopicStore();
  const { authUser } = useAuthStore();
  
  const [localSettings, setLocalSettings] = useState({
    enabled: true,
    minMessages: 5,
    timeThreshold: 60
  });
  
  // Check if user is the group creator (admin)
  const isGroupCreator = selectedGroup?.creatorId?._id === authUser?._id;
  
  // Initialize local settings from store
  useEffect(() => {
    setLocalSettings({
      enabled: topicSettings.enabled,
      minMessages: topicSettings.minMessages,
      timeThreshold: topicSettings.timeThreshold
    });
  }, [topicSettings]);

  const handleSave = async () => {
    if (!selectedGroup) return;
    
    await updateTopicSettings(selectedGroup._id, localSettings);
    
    if (localSettings.enabled) {
      onRefresh();
    }
    
    onClose();
  };

  return (
    <div className="p-4 border-b border-base-300 bg-base-200">
      <h4 className="font-medium mb-3">Topic Clustering Settings</h4>
      
      <div className="form-control mb-3">
        <label className="label cursor-pointer justify-start gap-4">
          <span className="label-text">Enable Topic Clustering</span>
          <input 
            type="checkbox" 
            className="toggle toggle-primary toggle-sm" 
            checked={localSettings.enabled}
            onChange={(e) => setLocalSettings({...localSettings, enabled: e.target.checked})}
            disabled={!isGroupCreator}
          />
        </label>
        {!isGroupCreator && (
          <p className="text-xs text-warning mt-1">
            Only the group creator can change these settings
          </p>
        )}
      </div>
      
      <div className="form-control mb-3">
        <label className="label">
          <span className="label-text">Minimum Messages for Topic</span>
        </label>
        <input 
          type="range" 
          min="2" 
          max="20" 
          value={localSettings.minMessages}
          onChange={(e) => setLocalSettings({...localSettings, minMessages: parseInt(e.target.value)})}
          className="range range-sm range-primary" 
          disabled={!isGroupCreator || !localSettings.enabled}
        />
        <div className="flex justify-between text-xs px-2">
          <span>2</span>
          <span>5</span>
          <span>10</span>
          <span>15</span>
          <span>20</span>
        </div>
        <div className="text-center text-sm mt-1">
          Current: {localSettings.minMessages}
        </div>
      </div>
      
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Topic Inactivity Threshold (minutes)</span>
        </label>
        <select 
          className="select select-bordered select-sm w-full"
          value={localSettings.timeThreshold}
          onChange={(e) => setLocalSettings({...localSettings, timeThreshold: parseInt(e.target.value)})}
          disabled={!isGroupCreator || !localSettings.enabled}
        >
          <option value="10">10 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="120">2 hours</option>
          <option value="360">6 hours</option>
          <option value="720">12 hours</option>
          <option value="1440">24 hours</option>
        </select>
      </div>
      
      <div className="flex justify-end gap-2">
        <button 
          className="btn btn-sm btn-ghost"
          onClick={onClose}
        >
          Cancel
        </button>
        <button 
          className="btn btn-sm btn-primary"
          onClick={handleSave}
          disabled={isSettingsLoading || !isGroupCreator}
        >
          {isSettingsLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default TopicSettings;