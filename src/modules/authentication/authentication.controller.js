import { Router } from "express";

import { successResponse } from "../../common/utils/index.js";
import { tokenTypeEnum } from "../../common/enum/index.js";
import { authentication, validation } from "../../middleware/index.js";
import * as validators from "./authentication.validation.js";
import {
  confirmLogin,
  login,
  loginWithGmail,
  requestForgetPasswordCode,
  resetForgotPassword,
  signup,
  verifyForgotPasswordCode,
} from "./authentication.service.js";

const router = Router();

//1: POST /users/signup
router.post("/signup", validation(validators.signup), async (req, res) => {
  const data = await signup(req.validate.body);
  return successResponse({ res, status: 201, data });
});

//2: POST /users/login
router.post("/login", validation(validators.login), async (req, res) => {
  const data = await login(req.validate.body);
  return successResponse({ res, data });
});

//3: POST /users/login/confirm
router.post(
  "/login/confirm",
  authentication(tokenTypeEnum.LOGIN_CHALLENGE),
  validation(validators.loginConfirm),
  async (req, res) => {
    const data = await confirmLogin(req.user, req.validate.body.otp);
    return successResponse({ res, data });
  },
);

//4: POST /users/login/gmail
router.post(
  "/login/gmail",
  validation(validators.loginWithGmail),
  async (req, res) => {
    const data = await loginWithGmail(req.validate.body);
    return successResponse({ res, data });
  },
);

//5: POST /users/forgot-password
router.post(
  "/forgot-password",
  validation(validators.forgotPassword),
  async (req, res) => {
    const data = await requestForgetPasswordCode(req.validate.body);
    return successResponse({ res, data });
  },
);

//6: POST /users/forgot-password/verify
router.post(
  "/forgot-password/verify",
  validation(validators.verifyForgotPassword),
  async (req, res) => {
    const data = await verifyForgotPasswordCode(req.validate.body);
    return successResponse({ res, data });
  },
);

//7: PATCH /users/forgot-password/reset
router.patch(
  "/forgot-password/reset",
  validation(validators.resetForgotPassword),
  async (req, res) => {
    const data = await resetForgotPassword(req.validate.body);
    return successResponse({ res, data });
  },
);

export default router;
