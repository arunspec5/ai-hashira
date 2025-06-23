import { useState } from "react";
import { X, Save, Trash2 } from "lucide-react";
import { useGroupChatStore } from "../store/useGroupChatStore";
import toast from "react-hot-toast";

const GroupSettingsModal = ({ isOpen, onClose }) => {
  const { selectedGroup, updateGroup, deleteGroup } = useGroupChatStore();
  
  const [groupName, setGroupName] = useState(selectedGroup?.name || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  if (!isOpen || !selectedGroup) return null;
  
  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }
    
    setIsUpdating(true);
    try {
      await updateGroup(selectedGroup._id, { name: groupName.trim() });
      toast.success("Group updated successfully");
      onClose();
    } catch (error) {
      console.error("Failed to update group:", error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleDeleteGroup = async () => {
    setIsDeleting(true);
    try {
      await deleteGroup(selectedGroup._id);
      toast.success("Group deleted successfully");
      onClose();
    } catch (error) {
      console.error("Failed to delete group:", error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Group Settings</h3>
          <button 
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            disabled={isUpdating || isDeleting}
          >
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleUpdateGroup}>
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
              disabled={isUpdating || isDeleting}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <button 
              type="button"
              className="btn btn-error"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isUpdating || isDeleting}
            >
              <Trash2 size={16} />
              Delete Group
            </button>
            
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={!groupName.trim() || groupName === selectedGroup.name || isUpdating || isDeleting}
            >
              {isUpdating ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Updating...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
        
        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-base-100 rounded-lg p-6 w-full max-w-sm">
              <h3 className="font-bold text-lg mb-4">Delete Group</h3>
              <p className="mb-4">
                Are you sure you want to delete the group "{selectedGroup.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button 
                  className="btn btn-ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-error"
                  onClick={handleDeleteGroup}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupSettingsModal;