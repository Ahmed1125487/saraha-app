import mongoose from "mongoose";

//created when the sender accepts an identity request
export const conversationSchema = new mongoose.Schema(
  {
    //one conversation per original message
    messageId: {
      type: mongoose.Types.ObjectId,
      ref: "Message",
      required: true,
      unique: true,
    },
    //the two users allowed inside the conversation
    members: {
      type: [{ type: mongoose.Types.ObjectId, ref: "User" }],
      validate: (value) => value.length === 2,
    },
  },
  { strict: true, strictQuery: true, timestamps: true },
);

export const ConversationModel =
  mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);
