import { unlink } from "node:fs/promises";
import { resolve } from "node:path";

import { EmailSubjectEnum } from "../../common/enum/index.js";
import { ConflictException } from "../../common/exceptions/index.js";
import { findByIdAndUpdate, paginate } from "../../common/repository/index.js";
import {
  createLoginCredentials,
  createRevokeToken,
  decryption,
  encryption,
  userBaseKey,
  userBaseRevokeTokenKey,
} from "../../common/security/index.js";
import {
  deleteCache,
  getCache,
  keysCache,
  setCache,
} from "../../common/services/index.js";
import {
  saveFile,
  sendEmailOtp,
  verifyEmailOtp,
} from "../../common/utils/index.js";
import { logoutEnum } from "../../common/enum/index.js";
import { UserModel } from "../../DB/model/user.model.js";

const PROFILE_CACHE_SECONDS = 300;
const USERS_PAGE_SIZE = 10;

const profileCacheKey = (userId) => `${userBaseKey({ userId })}::Profile`;

//1: the fields that are safe to send, the phone is decrypted
export const userResponse = (user) => ({
  _id: user._id,
  name: user.username,
  email: user.email,
  phone: decryption(user.phone),
  age: user.age,
  gender: user.gender,
  role: user.role,
  provider: user.provider,
  image: user.image,
  twoStepEnabled: user.twoStepEnabled,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

//2: profile, served from redis for 5 minutes
export const profile = async (user) => {
  const cached = await getCache({ key: profileCacheKey(user._id) });
  if (cached) return cached;

  //the json round trip makes the cached and the fresh response identical
  const data = JSON.parse(JSON.stringify(userResponse(user)));
  await setCache({
    key: profileCacheKey(user._id),
    value: data,
    ttl: PROFILE_CACHE_SECONDS,
  });
  return data;
};

//3: update the allowed fields
export const updateProfile = async (user, { name, phone, age, gender }) => {
  const update = { age, gender };
  if (name) {
    const [firstName, lastName] = name.split(" ");
    Object.assign(update, { firstName, lastName });
  }
  if (phone) update.phone = encryption(phone);

  const account = await findByIdAndUpdate({
    model: UserModel,
    id: user._id,
    update,
  });
  await deleteCache({ key: profileCacheKey(user._id) });

  return userResponse(account);
};

//4: profile image, the old image file is deleted
export const updateProfileImage = async (user, file) => {
  const image = await saveFile({ file, customPath: "users" });

  await findByIdAndUpdate({
    model: UserModel,
    id: user._id,
    update: { image },
  });
  await deleteCache({ key: profileCacheKey(user._id) });

  if (user.image) await unlink(resolve(user.image)).catch(() => {});
  return { message: "Profile image updated.", image };
};

//5: new token pair from a valid refresh token, the old pair is revoked
export const refreshToken = async (payload, user) => {
  const data = createLoginCredentials({ user });
  await createRevokeToken({ payload });
  return data;
};

//6: logout, by default from every device
export const logout = async (
  payload,
  user,
  { action = logoutEnum.ALL } = {},
) => {
  if (action === logoutEnum.ALL) {
    await findByIdAndUpdate({
      model: UserModel,
      id: user._id,
      update: { changeCredentialsTime: new Date() },
    });
    //the revoked keys are not needed anymore
    await deleteCache({
      key: await keysCache({
        prefix: userBaseRevokeTokenKey({ userId: user._id }),
      }),
    });
  } else {
    await createRevokeToken({ payload });
  }

  await deleteCache({ key: profileCacheKey(user._id) });
  return { message: "Logged out successfully." };
};

//7: 2-step-verification
export const requestTwoStep = async (user) => {
  if (user.twoStepEnabled)
    throw ConflictException("2-step-verification is already enabled");

  await sendEmailOtp({
    email: user.email,
    subject: EmailSubjectEnum.ENABLE_2FA,
    allowReplace: true,
  });
  return { message: "OTP sent to your email." };
};

export const confirmTwoStep = async (user, otp) => {
  if (user.twoStepEnabled)
    throw ConflictException("2-step-verification is already enabled");

  await verifyEmailOtp({
    email: user.email,
    subject: EmailSubjectEnum.ENABLE_2FA,
    otp,
  });
  await findByIdAndUpdate({
    model: UserModel,
    id: user._id,
    update: { twoStepEnabled: true },
  });
  await deleteCache({ key: profileCacheKey(user._id) });

  return { message: "2-step-verification enabled." };
};

//8: admin only, all users with pagination
export const listUsers = async ({ page }) => {
  const { result, ...pagination } = await paginate({
    model: UserModel,
    page,
    size: USERS_PAGE_SIZE,
    options: { sort: { createdAt: -1 } },
  });

  return { ...pagination, users: result.map(userResponse) };
};
