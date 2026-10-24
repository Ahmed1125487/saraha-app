import { z } from "zod";
import { RequestStatusEnum } from "../../common/enum/index.js";
import { generalValidationFields as fields } from "../../common/validation.js";

const content = z
  .string()
  .trim()
  .min(1, "content can't be empty")
  .max(1000, "content must be at most 1000 characters");

//1: POST /messages/send/:receiverId (text and/or up to 3 images)
export const sendMessage = z
  .object({
    params: z.object({ receiverId: fields.id }),
    body: z.object({ content: content.optional() }),
    files: z.array(fields.file).max(3).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.body.content && !data.files?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["body", "content"],
        message: "content or an attachment is required",
      });
    }
  });

//2: GET /messages/received
export const pagination = z.object({
  query: z.object({ page: fields.page }),
});

//3: GET /messages/:messageId and DELETE /messages/:messageId
export const messageId = z.object({
  params: z.object({ messageId: fields.id }),
});

//4: GET /messages/requests
export const getRequests = z.object({
  query: z.object({
    page: fields.page,
    status: z.enum(Object.values(RequestStatusEnum)).optional(),
  }),
});

//5: PATCH /messages/requests/:requestId
export const answerRequest = z.object({
  params: z.object({ requestId: fields.id }),
  body: z.strictObject({
    status: z.enum([RequestStatusEnum.ACCEPTED, RequestStatusEnum.REJECTED]),
  }),
});

//6: POST /messages/conversations/:conversationId/messages
export const sendChat = z.object({
  params: z.object({ conversationId: fields.id }),
  body: z.strictObject({ content }),
});

//7: GET /messages/conversations/:conversationId/messages
export const getChat = z.object({
  params: z.object({ conversationId: fields.id }),
  query: z.object({ page: fields.page }),
});
