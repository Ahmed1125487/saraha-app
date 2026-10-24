import { Router } from "express";

import {
  fileValidation,
  localFileUpload,
  successResponse,
} from "../../common/utils/index.js";
import {
  authentication,
  uploadMiddleware,
  validation,
} from "../../middleware/index.js";
import * as validators from "./message.validation.js";
import {
  answerRequest,
  deleteMessage,
  getChat,
  getMessage,
  getReceivedMessages,
  getRequests,
  requestIdentity,
  sendChat,
  sendMessage,
} from "./message.service.js";

const router = Router();

//every route needs a logged in user
router.use(authentication());

//1: POST /messages/send/:receiverId
router.post(
  "/send/:receiverId",
  uploadMiddleware({
    multerMiddleware: localFileUpload().array("attachments", 3),
    validation: fileValidation.image,
  }),
  validation(validators.sendMessage),
  async (req, res) => {
    const { params, body } = req.validate;
    const data = await sendMessage(
      req.user,
      params.receiverId,
      body,
      req.files,
    );
    return successResponse({ res, status: 201, data });
  },
);

//2: GET /messages/received
router.get("/received", validation(validators.pagination), async (req, res) => {
  const data = await getReceivedMessages(req.user, req.validate.query);
  return successResponse({ res, data });
});

//3: GET /messages/requests
router.get(
  "/requests",
  validation(validators.getRequests),
  async (req, res) => {
    const data = await getRequests(req.user, req.validate.query);
    return successResponse({ res, data });
  },
);

//4: PATCH /messages/requests/:requestId
router.patch(
  "/requests/:requestId",
  validation(validators.answerRequest),
  async (req, res) => {
    const { params, body } = req.validate;
    const data = await answerRequest(req.user, params.requestId, body);
    return successResponse({ res, data });
  },
);

//5: POST /messages/conversations/:conversationId/messages
router.post(
  "/conversations/:conversationId/messages",
  validation(validators.sendChat),
  async (req, res) => {
    const { params, body } = req.validate;
    const data = await sendChat(req.user, params.conversationId, body);
    return successResponse({ res, status: 201, data });
  },
);

//6: GET /messages/conversations/:conversationId/messages
router.get(
  "/conversations/:conversationId/messages",
  validation(validators.getChat),
  async (req, res) => {
    const { params, query } = req.validate;
    const data = await getChat(req.user, params.conversationId, query);
    return successResponse({ res, data });
  },
);

//7: POST /messages/:messageId/request-identity
router.post(
  "/:messageId/request-identity",
  validation(validators.messageId),
  async (req, res) => {
    const data = await requestIdentity(req.user, req.validate.params.messageId);
    return successResponse({ res, status: 201, data });
  },
);

//8: GET /messages/:messageId
router.get(
  "/:messageId",
  validation(validators.messageId),
  async (req, res) => {
    const data = await getMessage(req.user, req.validate.params.messageId);
    return successResponse({ res, data });
  },
);

//9: DELETE /messages/:messageId
router.delete(
  "/:messageId",
  validation(validators.messageId),
  async (req, res) => {
    const data = await deleteMessage(req.user, req.validate.params.messageId);
    return successResponse({ res, data });
  },
);

export default router;
