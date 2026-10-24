import { z } from "zod";
import { logoutEnum } from "../../common/enum/index.js";
import { generalValidationFields as fields } from "../../common/validation.js";

//1: GET /users
export const listUsers = z.object({
  query: z.object({ page: fields.page }),
});

//2: POST /users/2fa/confirm
export const confirmTwoStep = z.object({
  body: z.strictObject({ otp: fields.otp }),
});

//3: POST /users/logout, the body is optional
export const logout = z.object({
  body: z.strictObject({ action: z.enum(logoutEnum).default(logoutEnum.ALL) }),
});

//4: PATCH /users, only these fields can be changed
export const updateProfile = z.object({
  body: z
    .strictObject({
      name: fields.name,
      phone: fields.phone,
      age: fields.age,
      gender: fields.gender,
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, "nothing to update"),
});

//5: PATCH /users/profile-image
export const profileImage = z.object({
  files: z.array(fields.file).length(1),
});
