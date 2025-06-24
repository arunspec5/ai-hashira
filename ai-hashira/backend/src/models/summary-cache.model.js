import mongoose from "mongoose";

const summaryCacheSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
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

// Create a compound index for cache lookup
summaryCacheSchema.index({ 
  groupId: 1, 
  timeRange: 1, 
  detailLevel: 1,
  // Convert topics array to a string for indexing
  topics: 1
});

const SummaryCache = mongoose.model("SummaryCache", summaryCacheSchema);

export default SummaryCache;