import { randomInt } from "node:crypto";

import {
  BadException,
  ConflictException,
  ServiceUnavailableException,
  TooManyRequestException,
} from "../exceptions/index.js";
import { compare, hash } from "../security/index.js";
import {
  deleteCache,
  expireCache,
  getCache,
  incrementByCache,
  isCacheReady,
  ttlCache,
  setCache,
} from "../services/index.js";
import { emailEvent } from "./email/index.js";

const MAX_WRONG_ATTEMPTS = 5;

//1: redis keys
export const userEmailKey = ({ email, subject }) =>
  `User::${email}::${subject}::OTP`;

const trailsKey = (data) => `${userEmailKey(data)}::Trails`;
const failsKey = (data) => `${userEmailKey(data)}::Fails`;

//2: a 6 digits code
export const createOtp = () => String(randomInt(100000, 1000000));

//3: create the code, keep only its hash in redis and email the plain code
//a new code cannot be requested while the old one is valid (unless allowReplace)
//and after maxTrails requests the user is blocked for blockInSeconds
export const sendEmailOtp = async ({
  email,
  subject,
  expiresIn = 120,
  maxTrails = 3,
  blockInSeconds = 300,
  allowReplace = false,
}) => {
  if (!isCacheReady()) {
    throw ServiceUnavailableException("OTP service is not available now");
  }

  const key = userEmailKey({ email, subject });

  if (!allowReplace) {
    const existOtpTtl = await ttlCache({ key });
    if (existOtpTtl > 0) {
      throw ConflictException(
        `a valid code already exists, try again after ${existOtpTtl}s`,
      );
    }
  }

  const oldTrails = Number(
    (await getCache({ key: trailsKey({ email, subject }) })) ?? 0,
  );
  if (oldTrails >= maxTrails) {
    throw TooManyRequestException("max otp trails has been reached");
  }

  const code = createOtp();
  await setCache({ key, value: await hash(code), ttl: expiresIn });
  await deleteCache({ key: failsKey({ email, subject }) });

  const currentTrails = await incrementByCache({
    key: trailsKey({ email, subject }),
  });
  if (currentTrails === 1) {
    await expireCache({
      key: trailsKey({ email, subject }),
      ttl: blockInSeconds,
    });
  }

  emailEvent.emit("sendEmail", {
    recipients: { to: email },
    subject,
    data: { code },
  });
};

//4: check the code, after 5 wrong tries the code is deleted
//consume = false only checks the code (used before the final step of a flow)
export const verifyEmailOtp = async ({
  email,
  subject,
  otp,
  consume = true,
}) => {
  const key = userEmailKey({ email, subject });

  const savedHash = await getCache({ key });
  if (!savedHash) throw BadException("OTP expired or not requested");

  if (!(await compare(otp, savedHash))) {
    const fails = await incrementByCache({ key: failsKey({ email, subject }) });
    if (fails === 1) {
      await expireCache({ key: failsKey({ email, subject }), ttl: 300 });
    }
    if (fails >= MAX_WRONG_ATTEMPTS) await clearEmailOtp({ email, subject });
    throw BadException("Invalid OTP");
  }

  if (consume) await clearEmailOtp({ email, subject });
};

export const clearEmailOtp = async ({ email, subject }) => {
  await deleteCache({
    key: [
      userEmailKey({ email, subject }),
      trailsKey({ email, subject }),
      failsKey({ email, subject }),
    ],
  });
};
