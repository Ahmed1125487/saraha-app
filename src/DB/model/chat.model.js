import mongoose from "mongoose";

export const chatSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    content: {
      type: String,
      required: true,
      trim: true,
      minLength: 1,
      maxLength: 1000,
    },
  },
  { strict: true, strictQuery: true, timestamps: true },
);

export const ChatModel =
  mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatSchema);
