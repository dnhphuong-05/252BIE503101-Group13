import mongoose from "mongoose";

const chatboxMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const userChatboxConversationSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    messages: {
      type: [chatboxMessageSchema],
      default: [],
    },
    last_active_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "user_chatbox_conversations",
  },
);

export default mongoose.model(
  "UserChatboxConversation",
  userChatboxConversationSchema,
);
