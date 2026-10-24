import {
  BadException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "../../common/exceptions/index.js";
import {
  create,
  deleteMany,
  deleteOne,
  find,
  findById,
  findOne,
  findOneAndUpdate,
  paginate,
} from "../../common/repository/index.js";
import { RequestStatusEnum } from "../../common/enum/index.js";
import { saveFiles } from "../../common/utils/index.js";
import { ChatModel } from "../../DB/model/chat.model.js";
import { ConversationModel } from "../../DB/model/conversation.model.js";
import { MessageModel } from "../../DB/model/message.model.js";
import { RequestModel } from "../../DB/model/request.model.js";
import { UserModel } from "../../DB/model/user.model.js";

const INBOX_PAGE_SIZE = 10;
const REQUESTS_PAGE_SIZE = 10;
const CHAT_PAGE_SIZE = 20;

const isSame = (a, b) => a.toString() === b.toString();

//1: turns messages into inbox items, the sender is only revealed after the
//sender accepted an identity request
const buildInbox = async (messages) => {
  const ids = messages.map((message) => message._id);

  const [requests, conversations] = await Promise.all([
    find({ model: RequestModel, filter: { messageId: { $in: ids } } }),
    find({ model: ConversationModel, filter: { messageId: { $in: ids } } }),
  ]);

  const requestOf = new Map(requests.map((r) => [r.messageId.toString(), r]));
  const conversationOf = new Map(
    conversations.map((c) => [c.messageId.toString(), c]),
  );

  const acceptedSenderIds = requests
    .filter((r) => r.status === RequestStatusEnum.ACCEPTED)
    .map((r) => r.senderId);
  const senders = await find({
    model: UserModel,
    filter: { _id: { $in: acceptedSenderIds } },
    options: { select: "firstName lastName email" },
  });
  const senderOf = new Map(senders.map((u) => [u._id.toString(), u]));

  return messages.map((message) => {
    const request = requestOf.get(message._id.toString());
    const sender =
      request?.status === RequestStatusEnum.ACCEPTED
        ? senderOf.get(message.senderId.toString())
        : null;

    return {
      _id: message._id,
      content: message.content,
      attachments: message.attachments,
      createdAt: message.createdAt,
      requestStatus: request?.status ?? null,
      conversationId: conversationOf.get(message._id.toString())?._id ?? null,
      sender: sender
        ? { _id: sender._id, name: sender.username, email: sender.email }
        : null,
    };
  });
};

//2: send an anonymous message
export const sendMessage = async (
  user,
  receiverId,
  { content },
  files = [],
) => {
  if (isSame(user._id, receiverId)) {
    throw BadException("You can't send a message to yourself");
  }

  const receiver = await findById({
    model: UserModel,
    id: receiverId,
    options: { select: "_id" },
  });
  if (!receiver) throw NotFoundException("Receiver account not found");

  const attachments = await saveFiles({
    files,
    customPath: `messages/${receiverId}`,
  });

  const message = await create({
    model: MessageModel,
    data: { content, attachments, senderId: user._id, receiverId },
  });

  return { message: "Message sent anonymously.", id: message._id };
};

//3: inbox of the logged in user
export const getReceivedMessages = async (user, { page }) => {
  const { result, ...pagination } = await paginate({
    model: MessageModel,
    filter: { receiverId: user._id },
    page,
    size: INBOX_PAGE_SIZE,
    options: { sort: { createdAt: -1, _id: -1 } },
  });

  return { ...pagination, messages: await buildInbox(result) };
};

export const getMessage = async (user, messageId) => {
  const message = await findOne({
    model: MessageModel,
    filter: { _id: messageId, receiverId: user._id },
  });
  if (!message) throw NotFoundException("Message not found");

  const [item] = await buildInbox([message]);
  return item;
};

//4: delete a message with everything built on it
export const deleteMessage = async (user, messageId) => {
  const message = await findOne({
    model: MessageModel,
    filter: { _id: messageId, receiverId: user._id },
    options: { select: "_id" },
  });
  if (!message) throw NotFoundException("Message not found");

  const conversation = await findOne({
    model: ConversationModel,
    filter: { messageId },
    options: { select: "_id" },
  });
  if (conversation) {
    await deleteMany({
      model: ChatModel,
      filter: { conversationId: conversation._id },
    });
    await deleteOne({
      model: ConversationModel,
      filter: { _id: conversation._id },
    });
  }
  await deleteOne({ model: RequestModel, filter: { messageId } });
  await deleteOne({ model: MessageModel, filter: { _id: messageId } });

  return { message: "Message deleted." };
};

//5: the receiver asks who the sender is
export const requestIdentity = async (user, messageId) => {
  const message = await findById({ model: MessageModel, id: messageId });
  if (!message) throw NotFoundException("Message not found");

  if (!isSame(message.receiverId, user._id)) {
    throw ForbiddenException("Only the receiver can request the identity");
  }

  const exist = await findOne({
    model: RequestModel,
    filter: { messageId },
    options: { select: "_id" },
  });
  if (exist)
    throw ConflictException("Identity already requested for this message");

  const request = await create({
    model: RequestModel,
    data: {
      messageId,
      requesterId: user._id,
      senderId: message.senderId,
    },
  });

  return {
    message: "Identity request sent.",
    requestId: request._id,
    status: request.status,
  };
};

//6: requests that were sent to the logged in user (as the message sender)
export const getRequests = async (user, { page, status }) => {
  const filter = { senderId: user._id };
  if (status) filter.status = status;

  const { result, ...pagination } = await paginate({
    model: RequestModel,
    filter,
    page,
    size: REQUESTS_PAGE_SIZE,
    options: { sort: { createdAt: -1, _id: -1 } },
  });

  const [messages, requesters, conversations] = await Promise.all([
    find({
      model: MessageModel,
      filter: { _id: { $in: result.map((r) => r.messageId) } },
    }),
    find({
      model: UserModel,
      filter: { _id: { $in: result.map((r) => r.requesterId) } },
      options: { select: "firstName lastName email" },
    }),
    find({
      model: ConversationModel,
      filter: { messageId: { $in: result.map((r) => r.messageId) } },
    }),
  ]);
  const messageOf = new Map(messages.map((m) => [m._id.toString(), m]));
  const requesterOf = new Map(requesters.map((u) => [u._id.toString(), u]));
  const conversationOf = new Map(
    conversations.map((c) => [c.messageId.toString(), c._id]),
  );

  return {
    ...pagination,
    requests: result.map((request) => {
      const requester = requesterOf.get(request.requesterId.toString());
      return {
        _id: request._id,
        status: request.status,
        createdAt: request.createdAt,
        message: {
          _id: request.messageId,
          content: messageOf.get(request.messageId.toString())?.content,
        },
        requester: requester
          ? { _id: requester._id, name: requester.username }
          : null,
        conversationId:
          conversationOf.get(request.messageId.toString()) ?? null,
      };
    }),
  };
};

//7: the sender accepts or rejects, accepting opens a conversation
export const answerRequest = async (user, requestId, { status }) => {
  const request = await findById({ model: RequestModel, id: requestId });
  if (!request) throw NotFoundException("Request not found");

  if (!isSame(request.senderId, user._id)) {
    throw ForbiddenException("Only the message sender can answer this request");
  }
  if (request.status !== RequestStatusEnum.PENDING) {
    throw ConflictException(`Request already ${request.status}`);
  }

  //the filter on status makes sure two answers can't both win
  const updated = await findOneAndUpdate({
    model: RequestModel,
    filter: { _id: requestId, status: RequestStatusEnum.PENDING },
    update: { status },
  });
  if (!updated) throw ConflictException("Request already answered");

  if (status === RequestStatusEnum.REJECTED) {
    return { message: "Request rejected.", status };
  }

  const conversation = await create({
    model: ConversationModel,
    data: {
      messageId: request.messageId,
      members: [request.senderId, request.requesterId],
    },
  });

  return {
    message: "Request accepted.",
    status,
    conversationId: conversation._id,
  };
};

//8: conversation, only its two members get in
const getConversationOfMember = async (user, conversationId) => {
  const conversation = await findById({
    model: ConversationModel,
    id: conversationId,
  });
  if (!conversation) throw NotFoundException("Conversation not found");

  if (!conversation.members.some((member) => isSame(member, user._id))) {
    throw ForbiddenException("You are not a member of this conversation");
  }
  return conversation;
};

export const sendChat = async (user, conversationId, { content }) => {
  const conversation = await getConversationOfMember(user, conversationId);

  const chat = await create({
    model: ChatModel,
    data: { conversationId: conversation._id, senderId: user._id, content },
  });

  return { message: "Message sent.", id: chat._id, createdAt: chat.createdAt };
};

export const getChat = async (user, conversationId, { page }) => {
  const conversation = await getConversationOfMember(user, conversationId);

  const { result, ...pagination } = await paginate({
    model: ChatModel,
    filter: { conversationId: conversation._id },
    page,
    size: CHAT_PAGE_SIZE,
    options: { sort: { createdAt: 1, _id: 1 } },
  });

  return {
    conversationId: conversation._id,
    ...pagination,
    messages: result.map((chat) => ({
      _id: chat._id,
      senderId: chat.senderId,
      mine: isSame(chat.senderId, user._id),
      content: chat.content,
      createdAt: chat.createdAt,
    })),
  };
};
