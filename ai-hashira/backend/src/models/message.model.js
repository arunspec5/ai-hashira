import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    isThreadReply: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Add validation to ensure either receiverId OR groupId is provided
messageSchema.pre('validate', function(next) {
  if (!this.receiverId && !this.groupId) {
    return next(new Error('Message must have either a receiverId or a groupId'));
  }
  if (this.receiverId && this.groupId) {
    return next(new Error('Message cannot have both a receiverId and a groupId'));
  }
  next();
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
