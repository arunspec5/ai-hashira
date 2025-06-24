import mongoose from "mongoose";

const topicSettingsSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      unique: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    minMessages: {
      type: Number,
      default: 5,
      min: 2,
      max: 20,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value'
      }
    },
    timeThreshold: {
      type: Number,
      default: 60, // minutes
      min: 10,
      max: 1440, // 24 hours (1 day)
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value'
      }
    },
    lastProcessedMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true }
);

// Create an index on groupId for faster lookups
topicSettingsSchema.index({ groupId: 1 });

// Static method to get settings with defaults
topicSettingsSchema.statics.getSettingsForGroup = async function (groupId) {
  let settings = await this.findOne({ groupId });

  if (!settings) {
    // Create default settings if none exist
    settings = new this({
      groupId,
      enabled: true,
      minMessages: 5,
      timeThreshold: 60
    });
    await settings.save();
  }

  return settings;
};

// Method to validate settings
topicSettingsSchema.methods.validateSettings = function () {
  // Ensure minMessages is within bounds
  if (this.minMessages < 2) this.minMessages = 2;
  if (this.minMessages > 20) this.minMessages = 20;

  // Ensure timeThreshold is within bounds
  if (this.timeThreshold < 10) this.timeThreshold = 10;
  if (this.timeThreshold > 1440) this.timeThreshold = 1440;

  return true;
};

// Pre-save middleware to validate settings
topicSettingsSchema.pre('save', function (next) {
  this.validateSettings();
  next();
});

const TopicSettings = mongoose.model("TopicSettings", topicSettingsSchema);

export default TopicSettings;