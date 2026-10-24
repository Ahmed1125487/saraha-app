import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

import {
  ACCESS_ADMIN_TOKEN_SIGNATURE,
  ACCESS_TOKEN_EXPIRES_IN,
  ACCESS_USER_TOKEN_SIGNATURE,
  LOGIN_CHALLENGE_TOKEN_EXPIRES_IN,
  LOGIN_CHALLENGE_TOKEN_SIGNATURE,
  REFRESH_ADMIN_TOKEN_SIGNATURE,
  REFRESH_TOKEN_EXPIRES_IN,
  REFRESH_USER_TOKEN_SIGNATURE,
} from "../../config.js";
import { UnAuthorizedException } from "../exceptions/error.exception.js";
import { findById } from "../repository/base.repository.js";
import { UserModel } from "../../DB/model/user.model.js";
import { RoleEnum, tokenTypeEnum } from "../enum/index.js";
import { existCache, setCache } from "../services/index.js";

//1: redis keys
export const userBaseKey = ({ userId }) => `User::${userId.toString()}`;

export const userBaseRevokeTokenKey = ({ userId }) =>
  `${userBaseKey({ userId })}::Revoke_Token`;

export const userRevokeTokenKey = ({ userId, jti }) =>
  `${userBaseRevokeTokenKey({ userId })}::${jti}`;

//2: secrets and lifetimes
const signatures = {
  [RoleEnum.USER]: {
    access: ACCESS_USER_TOKEN_SIGNATURE,
    refresh: REFRESH_USER_TOKEN_SIGNATURE,
  },
  [RoleEnum.ADMIN]: {
    access: ACCESS_ADMIN_TOKEN_SIGNATURE,
    refresh: REFRESH_ADMIN_TOKEN_SIGNATURE,
  },
};

const lifetimes = {
  [tokenTypeEnum.ACCESS]: ACCESS_TOKEN_EXPIRES_IN,
  [tokenTypeEnum.REFRESH]: REFRESH_TOKEN_EXPIRES_IN,
  [tokenTypeEnum.LOGIN_CHALLENGE]: LOGIN_CHALLENGE_TOKEN_EXPIRES_IN,
};

const getSignature = ({ tokenType, role }) => {
  if (tokenType === tokenTypeEnum.LOGIN_CHALLENGE) {
    return LOGIN_CHALLENGE_TOKEN_SIGNATURE;
  }
  const roleSignatures = signatures[role];
  if (!roleSignatures) throw new Error("unknown role");

  return tokenType === tokenTypeEnum.ACCESS
    ? roleSignatures.access
    : roleSignatures.refresh;
};

const signToken = ({ user, tokenType, jwtId }) => {
  return jwt.sign(
    { id: user._id },
    getSignature({ tokenType, role: user.role }),
    {
      algorithm: "HS256",
      audience: [String(user.role)],
      expiresIn: lifetimes[tokenType],
      jwtid: jwtId,
    },
  );
};

//3: create tokens, the access and refresh tokens share the same jti so
//revoking one revokes the pair
export const createLoginCredentials = ({ user }) => {
  const jwtId = randomUUID();

  return {
    access_token: signToken({ user, tokenType: tokenTypeEnum.ACCESS, jwtId }),
    refresh_token: signToken({
      user,
      tokenType: tokenTypeEnum.REFRESH,
      jwtId,
    }),
  };
};

export const createLoginChallengeToken = ({ user }) => {
  return signToken({
    user,
    tokenType: tokenTypeEnum.LOGIN_CHALLENGE,
    jwtId: randomUUID(),
  });
};

//4: validate a token and load its user
export const decodeToken = async ({
  token,
  tokenType = tokenTypeEnum.ACCESS,
}) => {
  //the audience (role) only selects the secret, the signature is verified after
  const role = jwt.decode(token)?.aud?.[0];

  let payload;
  try {
    payload = jwt.verify(
      token,
      getSignature({ tokenType, role: Number(role) }),
      { algorithms: ["HS256"] },
    );
  } catch (error) {
    throw UnAuthorizedException("Invalid or expired token");
  }
  if (!payload.id) throw UnAuthorizedException("Invalid token payload");

  const isRevoked = await existCache({
    key: userRevokeTokenKey({ userId: payload.id, jti: payload.jti }),
  });
  if (isRevoked) throw UnAuthorizedException("Expired login credentials");

  const user = await findById({ model: UserModel, id: payload.id });
  if (!user) throw UnAuthorizedException("Account no longer exists");

  //the role inside the token must still be the role of the account
  if (String(user.role) !== String(role)) {
    throw UnAuthorizedException("Expired login credentials");
  }

  //logout from all devices / password reset
  if ((user.changeCredentialsTime?.getTime() ?? 0) > payload.iat * 1000) {
    throw UnAuthorizedException("Expired login credentials");
  }

  return { user, payload };
};

//5: revoke a token pair, the key must live as long as the refresh token
export const createRevokeToken = async ({ payload }) => {
  const ttl =
    payload.iat + REFRESH_TOKEN_EXPIRES_IN - Math.floor(Date.now() / 1000);
  if (ttl <= 0) return;

  await setCache({
    key: userRevokeTokenKey({ userId: payload.id, jti: payload.jti }),
    value: payload.jti,
    ttl,
  });
};
