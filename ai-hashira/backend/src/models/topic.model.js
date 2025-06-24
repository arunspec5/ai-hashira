import mongoose from "mongoose";

const topicSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    messageIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create a compound index on groupId and label for faster lookups
topicSchema.index({ groupId: 1, label: 1 });

// Create an index on groupId and isActive for efficient filtering of active topics
topicSchema.index({ groupId: 1, isActive: 1 });

// Create an index on lastMessageAt for time-based queries
topicSchema.index({ lastMessageAt: -1 });

// Validation method to ensure messageIds are unique
topicSchema.methods.validateMessageIds = function() {
  if (this.messageIds && Array.isArray(this.messageIds)) {
    // Remove duplicates by converting to Set and back to Array
    this.messageIds = [...new Set(this.messageIds.map(id => id.toString()))];
  } else {
    this.messageIds = [];
  }
  return true;
};

// Pre-save middleware to validate messageIds
topicSchema.pre('save', function(next) {
  this.validateMessageIds();
  next();
});

// Method to add messages to a topic
topicSchema.methods.addMessages = function(messageIds) {
  if (!Array.isArray(messageIds)) {
    messageIds = [messageIds];
  }
  
  // Add new message IDs
  this.messageIds.push(...messageIds);
  
  // Update lastMessageAt
  this.lastMessageAt = new Date();
  
  // Remove duplicates
  this.validateMessageIds();
  
  return this;
};

// Static method to find active topics for a group
topicSchema.statics.findActiveTopicsForGroup = function(groupId) {
  return this.find({ groupId, isActive: true })
    .sort({ lastMessageAt: -1 });
};

const Topic = mongoose.model("Topic", topicSchema);

export default Topic;