import mongoose from "mongoose";

export const messageSchema = new mongoose.Schema(
  {
    //text is optional when the message has an attachment
    content: {
      type: String,
      trim: true,
      required: function () {
        return !this.attachments?.length;
      },
      minLength: 1,
      maxLength: 1000,
    },
    attachments: [String],

    senderId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    receiverId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    strict: true,
    strictQuery: true,
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
);

export const MessageModel =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
