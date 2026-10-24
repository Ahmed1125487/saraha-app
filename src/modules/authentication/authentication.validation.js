import { z } from "zod";
import {
  generalValidationFields as fields,
  passwordsMatch,
} from "../../common/validation.js";

//1: POST /users/signup
export const signup = z.object({
  body: z
    .strictObject({
      name: fields.name,
      email: fields.email,
      password: fields.password,
      confirmPassword: fields.confirmPassword,
      phone: fields.phone,
      age: fields.age,
      gender: fields.gender.optional(),
    })
    .superRefine(passwordsMatch),
});

//2: POST /users/login
export const login = z.object({
  body: z.strictObject({
    email: fields.email,
    password: z.string().min(1, "password is required"),
  }),
});

//3: POST /users/login/confirm
export const loginConfirm = z.object({
  body: z.strictObject({ otp: fields.otp }),
});

//4: POST /users/login/gmail
export const loginWithGmail = z.object({
  body: z.strictObject({
    idToken: z.string().min(10, "idToken is required"),
  }),
});

//5: forgot password flow
export const forgotPassword = z.object({
  body: z.strictObject({ email: fields.email }),
});

export const verifyForgotPassword = z.object({
  body: z.strictObject({ email: fields.email, otp: fields.otp }),
});

export const resetForgotPassword = z.object({
  body: z
    .strictObject({
      email: fields.email,
      otp: fields.otp,
      password: fields.password,
      confirmPassword: fields.confirmPassword,
    })
    .superRefine(passwordsMatch),
});
