import { useState } from "react";

const SummaryOptions = ({ options, onChange, onClose }) => {
  const [localOptions, setLocalOptions] = useState(options);
  const [topicsInput, setTopicsInput] = useState(options.topics.join(", "));
  
  const handleSave = () => {
    // Parse topics from comma-separated string
    const topics = topicsInput
      .split(",")
      .map(t => t.trim())
      .filter(t => t);
    
    const updatedOptions = {
      ...localOptions,
      topics
    };
    
    onChange(updatedOptions);
    onClose();
  };
  
  return (
    <div className="p-4 border-b border-base-300 bg-base-200">
      <h4 className="font-medium mb-3">Summary Options</h4>
      
      <div className="form-control mb-3">
        <label className="label">
          <span className="label-text">Time Range</span>
        </label>
        <select 
          className="select select-bordered select-sm w-full"
          value={localOptions.timeRange}
          onChange={(e) => setLocalOptions({...localOptions, timeRange: e.target.value})}
        >
          <option value="hour">Last Hour</option>
          <option value="day">Last 24 Hours</option>
          <option value="week">Last Week</option>
          <option value="all">All Messages</option>
        </select>
      </div>
      
      <div className="form-control mb-3">
        <label className="label">
          <span className="label-text">Topics (comma separated)</span>
        </label>
        <input 
          type="text"
          className="input input-bordered input-sm w-full"
          value={topicsInput}
          onChange={(e) => setTopicsInput(e.target.value)}
          placeholder="e.g. project, deadline, tasks"
        />
      </div>
      
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Detail Level</span>
        </label>
        <select 
          className="select select-bordered select-sm w-full"
          value={localOptions.detailLevel}
          onChange={(e) => setLocalOptions({...localOptions, detailLevel: e.target.value})}
        >
          <option value="brief">Brief</option>
          <option value="moderate">Moderate</option>
          <option value="detailed">Detailed</option>
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
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default SummaryOptions;