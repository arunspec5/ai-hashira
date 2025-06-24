import mongoose from "mongoose";

const summaryPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    timeRange: {
      type: String,
      enum: ["hour", "day", "week", "all"],
      default: "all",
    },
    topics: [String],
    detailLevel: {
      type: String,
      enum: ["brief", "moderate", "detailed"],
      default: "moderate",
    },
  },
  { timestamps: true }
);

// Validation method to ensure topics are properly formatted
summaryPreferenceSchema.methods.validateTopics = function() {
  // Ensure topics are strings and trim whitespace
  if (this.topics && Array.isArray(this.topics)) {
    this.topics = this.topics
      .map(topic => typeof topic === 'string' ? topic.trim() : '')
      .filter(topic => topic.length > 0);
  } else {
    this.topics = [];
  }
  return true;
};

// Pre-save middleware to validate topics
summaryPreferenceSchema.pre('save', function(next) {
  this.validateTopics();
  next();
});

const SummaryPreference = mongoose.model("SummaryPreference", summaryPreferenceSchema);

export default SummaryPreference;