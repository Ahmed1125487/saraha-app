import { OAuth2Client } from "google-auth-library";

import { EmailSubjectEnum, ProviderEnum } from "../../common/enum/index.js";
import {
  BadException,
  ConflictException,
  TooManyRequestException,
  UnAuthorizedException,
} from "../../common/exceptions/index.js";
import { create, findOne, updateOne } from "../../common/repository/index.js";
import {
  compare,
  createLoginChallengeToken,
  createLoginCredentials,
  encryption,
  hash,
  userBaseRevokeTokenKey,
} from "../../common/security/index.js";
import {
  deleteCache,
  expireCache,
  incrementByCache,
  keysCache,
  setCache,
  ttlCache,
} from "../../common/services/index.js";
import {
  clearEmailOtp,
  sendEmailOtp,
  verifyEmailOtp,
} from "../../common/utils/index.js";
import {
  LOGIN_BAN_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  WEB_CLIENT_ID,
} from "../../config.js";
import { UserModel } from "../../DB/model/user.model.js";

const googleClient = new OAuth2Client();

//1: login protection, too many wrong passwords ban the email for a while
const failsKey = (email) => `Login::${email}::Fails`;
const banKey = (email) => `Login::${email}::Ban`;

const registerFailedLogin = async (email) => {
  const fails = await incrementByCache({ key: failsKey(email) });
  if (!fails) return;

  if (fails === 1) {
    await expireCache({ key: failsKey(email), ttl: LOGIN_BAN_MINUTES * 60 });
  }
  if (fails >= MAX_FAILED_LOGIN_ATTEMPTS) {
    await setCache({
      key: banKey(email),
      value: 1,
      ttl: LOGIN_BAN_MINUTES * 60,
    });
    await deleteCache({ key: failsKey(email) });
  }
};

//2: signup
export const signup = async ({ name, email, password, phone, age, gender }) => {
  const existAccount = await findOne({
    model: UserModel,
    filter: { email },
    options: { select: "_id" },
  });
  if (existAccount) throw BadException("Email already exists");

  await create({
    model: UserModel,
    data: {
      username: name,
      email,
      password: await hash(password),
      phone: encryption(phone),
      age,
      gender,
      provider: ProviderEnum.SYSTEM,
    },
  });

  return { message: "User added successfully." };
};

//3: login, with 2-step-verification on it returns a challenge token instead
export const login = async ({ email, password }) => {
  const banTtl = await ttlCache({ key: banKey(email) });
  if (banTtl > 0) {
    throw TooManyRequestException(
      `Account temporarily banned, try again in ${banTtl}s`,
    );
  }

  const account = await findOne({
    model: UserModel,
    filter: { email, provider: ProviderEnum.SYSTEM },
  });

  //same answer for a wrong email and a wrong password
  if (!account || !(await compare(password, account.password))) {
    await registerFailedLogin(email);
    throw UnAuthorizedException("Invalid email or password");
  }

  if (account.twoStepEnabled) {
    await sendEmailOtp({
      email,
      subject: EmailSubjectEnum.LOGIN_2FA,
      allowReplace: true,
    });
    return {
      message: "OTP sent to your email, please confirm login.",
      login_challenge_token: createLoginChallengeToken({ user: account }),
    };
  }

  await deleteCache({ key: failsKey(email) });
  return {
    message: "Login successful",
    ...createLoginCredentials({ user: account }),
  };
};

//4: confirm the 2-step-verification code of a login
export const confirmLogin = async (user, otp) => {
  await verifyEmailOtp({
    email: user.email,
    subject: EmailSubjectEnum.LOGIN_2FA,
    otp,
  });
  await deleteCache({ key: failsKey(user.email) });

  return { message: "Login successful", ...createLoginCredentials({ user }) };
};

//5: google sign in, creates the account on the first time
export const loginWithGmail = async ({ idToken }) => {
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: WEB_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (error) {
    throw BadException("Invalid Google token");
  }
  if (!payload?.email || payload.email_verified !== true) {
    throw BadException("Google email is not verified");
  }

  const email = payload.email.toLowerCase();
  let account = await findOne({ model: UserModel, filter: { email } });

  //a password account must not be taken over through google
  if (account && account.provider !== ProviderEnum.GOOGLE) {
    throw ConflictException(
      "This email is registered with a password, use login",
    );
  }

  if (!account) {
    account = await create({
      model: UserModel,
      data: {
        username: payload.name ?? email.split("@")[0],
        email,
        provider: ProviderEnum.GOOGLE,
        image: payload.picture,
      },
    });
  }

  return {
    message: "Login successful",
    ...createLoginCredentials({ user: account }),
  };
};

//6: forgot password, step 1
export const requestForgetPasswordCode = async ({ email }) => {
  const account = await findOne({
    model: UserModel,
    filter: { email, provider: ProviderEnum.SYSTEM },
    options: { select: "_id" },
  });

  //the answer is the same when the email is not registered
  if (account) {
    await sendEmailOtp({ email, subject: EmailSubjectEnum.FORGET_PASSWORD });
  }
  return { message: "If the email is registered, a code was sent to it." };
};

//7: forgot password, step 2
export const verifyForgotPasswordCode = async ({ email, otp }) => {
  await verifyEmailOtp({
    email,
    subject: EmailSubjectEnum.FORGET_PASSWORD,
    otp,
    consume: false,
  });
  return { message: "Code is valid." };
};

//8: forgot password, step 3, every old token becomes invalid
export const resetForgotPassword = async ({ email, otp, password }) => {
  const account = await findOne({
    model: UserModel,
    filter: { email, provider: ProviderEnum.SYSTEM },
  });
  await verifyEmailOtp({
    email,
    subject: EmailSubjectEnum.FORGET_PASSWORD,
    otp,
    consume: false,
  });
  if (!account) throw BadException("Invalid OTP");

  await updateOne({
    model: UserModel,
    filter: { _id: account._id },
    update: {
      password: await hash(password),
      changeCredentialsTime: new Date(),
    },
  });

  await clearEmailOtp({ email, subject: EmailSubjectEnum.FORGET_PASSWORD });
  await deleteCache({
    key: await keysCache({
      prefix: userBaseRevokeTokenKey({ userId: account._id }),
    }),
  });

  return { message: "Password changed successfully." };
};
