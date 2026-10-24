import mongoose from "mongoose";
import { RequestStatusEnum } from "../../common/enum/index.js";

//asked by the receiver of a message: "who sent me this?"
export const requestSchema = new mongoose.Schema(
  {
    //one request per message
    messageId: {
      type: mongoose.Types.ObjectId,
      ref: "Message",
      required: true,
      unique: true,
    },
    requesterId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    senderId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(RequestStatusEnum),
      default: RequestStatusEnum.PENDING,
    },
  },
  { strict: true, strictQuery: true, timestamps: true },
);

export const RequestModel =
  mongoose.models.IdentityRequest ||
  mongoose.model("IdentityRequest", requestSchema);
