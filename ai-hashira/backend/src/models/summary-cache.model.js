import mongoose from "mongoose";

const summaryCacheSchema = new mongoose.Schema(
  {
    // Either groupId or threadId will be present, but not both
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: function() {
        return !this.threadId;
      },
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message", // Parent message ID
      required: function() {
        return !this.groupId;
      },
    },
    timeRange: {
      type: String,
      enum: ["hour", "day", "week", "all"],
      required: true,
    },
    topics: [String],
    detailLevel: {
      type: String,
      enum: ["brief", "moderate", "detailed"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    messageCount: {
      type: Number,
      required: true,
    },
    lastMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    tokenUsage: {
      inputTokens: Number,
      outputTokens: Number,
      totalTokens: Number,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index
    }
  },
  { timestamps: true }
);

// Create compound indexes for cache lookup
// Index for group summaries
summaryCacheSchema.index({ 
  groupId: 1, 
  timeRange: 1, 
  detailLevel: 1,
  topics: 1
});

// Index for thread summaries
summaryCacheSchema.index({ 
  threadId: 1, 
  timeRange: 1, 
  detailLevel: 1,
  topics: 1
});

const SummaryCache = mongoose.model("SummaryCache", summaryCacheSchema);

export default SummaryCache;