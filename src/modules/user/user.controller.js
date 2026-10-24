import { Router } from "express";

import { RoleEnum, tokenTypeEnum } from "../../common/enum/index.js";
import {
  fileValidation,
  localFileUpload,
  successResponse,
} from "../../common/utils/index.js";
import {
  authentication,
  authorization,
  uploadMiddleware,
  validation,
} from "../../middleware/index.js";
import * as validators from "./user.validation.js";
import {
  confirmTwoStep,
  listUsers,
  logout,
  profile,
  refreshToken,
  requestTwoStep,
  updateProfile,
  updateProfileImage,
} from "./user.service.js";

const router = Router();

//1: GET /users/profile
router.get("/profile", authentication(), async (req, res) => {
  const data = await profile(req.user);
  return successResponse({ res, data });
});

//2: POST /users/refresh-token
router.post(
  "/refresh-token",
  authentication(tokenTypeEnum.REFRESH),
  async (req, res) => {
    const data = await refreshToken(req.payload, req.user);
    return successResponse({ res, data });
  },
);

//3: POST /users/logout
router.post(
  "/logout",
  authentication(),
  validation(validators.logout),
  async (req, res) => {
    const data = await logout(req.payload, req.user, req.validate.body);
    return successResponse({ res, data });
  },
);

//4: POST /users/2fa/enable
router.post("/2fa/enable", authentication(), async (req, res) => {
  const data = await requestTwoStep(req.user);
  return successResponse({ res, data });
});

//5: POST /users/2fa/confirm
router.post(
  "/2fa/confirm",
  authentication(),
  validation(validators.confirmTwoStep),
  async (req, res) => {
    const data = await confirmTwoStep(req.user, req.validate.body.otp);
    return successResponse({ res, data });
  },
);

//6: PATCH /users/profile-image
router.patch(
  "/profile-image",
  authentication(),
  uploadMiddleware({
    multerMiddleware: localFileUpload({ maxFileSize: 2 }).single("attachment"),
    validation: fileValidation.image,
    isRequired: true,
  }),
  validation(validators.profileImage),
  async (req, res) => {
    const data = await updateProfileImage(req.user, req.file);
    return successResponse({ res, data });
  },
);

//7: PATCH /users
router.patch(
  "/",
  authentication(),
  validation(validators.updateProfile),
  async (req, res) => {
    const data = await updateProfile(req.user, req.validate.body);
    return successResponse({ res, data });
  },
);

//8: GET /users (admin only)
router.get(
  "/",
  authentication(),
  authorization(RoleEnum.ADMIN),
  validation(validators.listUsers),
  async (req, res) => {
    const data = await listUsers(req.validate.query);
    return successResponse({ res, data });
  },
);

export default router;
