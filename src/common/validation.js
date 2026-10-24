import { z } from "zod";
import { GenderEnum } from "./enum/user.enum.js";

export const generalValidationFields = {
  name: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z]{2,20} [A-Za-z]{2,20}$/,
      "name must be 'First Last', e.g. Eyad Tarek",
    ),

  email: z
    .email("please enter a valid email like : example@domain.com")
    .trim()
    .toLowerCase(),

  password: z
    .string()
    .min(8, "password must be at least 8 characters")
    .max(64, "password must be at most 64 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      "password must have an uppercase, a lowercase and a digit",
    ),

  confirmPassword: z.string(),

  phone: z
    .string()
    .regex(
      /^(\+2|002)?01[0125]\d{8}$/,
      "please enter a valid Egyptian phone number",
    ),

  age: z.number().int().min(18).max(60),
  gender: z.enum(GenderEnum),

  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code"),

  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "invalid id"),

  page: z.coerce.number().int().min(1).default(1),

  //shape of a file produced by multer
  file: z.object({
    fieldname: z.string(),
    originalname: z.string(),
    mimetype: z.string(),
    buffer: z.instanceof(Buffer),
    size: z.number(),
  }),
};

//adds an issue on confirmPassword when it is different from password
export const passwordsMatch = (data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmPassword"],
      message: "password and confirmPassword don't match",
    });
  }
};
