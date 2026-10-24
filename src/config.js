import { resolve } from "node:path";
import { config } from "dotenv";

export const NODE_ENV = process.env.NODE_ENV ?? "development";

config({ path: resolve(`.env.${NODE_ENV}`) });

//1: server
export const PORT = parseInt(process.env.PORT ?? "9000");
export const TRUST_PROXY = parseInt(process.env.TRUST_PROXY ?? "0");

//2: hashing and encryption
export const SALT = parseInt(process.env.SALT ?? "12");
export const ENC_KEY = process.env.ENC_KEY;

//3: databases
export const DB_URI = process.env.DB_URI;
export const REDIS_URI = process.env.REDIS_URI;

//4: tokens (expiry in seconds)
export const ACCESS_USER_TOKEN_SIGNATURE =
  process.env.ACCESS_USER_TOKEN_SIGNATURE;
export const ACCESS_ADMIN_TOKEN_SIGNATURE =
  process.env.ACCESS_ADMIN_TOKEN_SIGNATURE;
export const ACCESS_TOKEN_EXPIRES_IN = parseInt(
  process.env.ACCESS_TOKEN_EXPIRES_IN ?? "1800",
);

export const REFRESH_USER_TOKEN_SIGNATURE = process.env.REFRESH_TOKEN_SIGNATURE;
export const REFRESH_ADMIN_TOKEN_SIGNATURE =
  process.env.REFRESH_TOKEN_SIGNATURE;
export const REFRESH_TOKEN_EXPIRES_IN = parseInt(
  process.env.REFRESH_TOKEN_EXPIRES_IN ?? "31536000",
);

//the short lived token returned when the login needs a 2FA code
export const LOGIN_CHALLENGE_TOKEN_SIGNATURE =
  process.env.LOGIN_CHALLENGE_TOKEN_SIGNATURE ??
  `${process.env.ACCESS_USER_TOKEN_SIGNATURE}::login-challenge`;
export const LOGIN_CHALLENGE_TOKEN_EXPIRES_IN = 300;

//5: login protection
export const MAX_FAILED_LOGIN_ATTEMPTS = parseInt(
  process.env.MAX_FAILED_LOGIN_ATTEMPTS ?? "5",
);
export const LOGIN_BAN_MINUTES = parseInt(process.env.LOGIN_BAN_MINUTES ?? "5");

//6: email (when empty the codes are printed in the console)
export const APP_EMAIL = process.env.APP_EMAIL;
export const APP_PASSWORD = process.env.APP_PASSWORD;
export const APPLICATION_NAME = process.env.APPLICATION_NAME ?? "Saraha";

//7: google sign in
export const WEB_CLIENT_ID = (process.env.WEB_CLIENT_ID ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const required = {
  DB_URI,
  ENC_KEY,
  ACCESS_USER_TOKEN_SIGNATURE,
  ACCESS_ADMIN_TOKEN_SIGNATURE,
  REFRESH_TOKEN_SIGNATURE: REFRESH_USER_TOKEN_SIGNATURE,
};
const missing = Object.keys(required).filter((name) => !required[name]);
if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(", ")}`);
}
