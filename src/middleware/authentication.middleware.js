import { tokenTypeEnum } from "../common/enum/security.enum.js";
import {
  ForbiddenException,
  UnAuthorizedException,
} from "../common/exceptions/error.exception.js";
import { decodeToken } from "../common/security/token.security.js";

//requires "Authorization: Bearer <token>" and sets req.user and req.payload
export const authentication = (tokenType = tokenTypeEnum.ACCESS) => {
  return async (req, res, next) => {
    const [scheme, token] = (req.headers.authorization ?? "")
      .trim()
      .split(/\s+/);

    if (scheme !== "Bearer" || !token) {
      throw UnAuthorizedException("Missing or invalid Authorization header");
    }

    const { user, payload } = await decodeToken({ token, tokenType });
    req.user = user;
    req.payload = payload;
    next();
  };
};

//allows the request when the role of the user is at least accessRole
export const authorization = (accessRole) => {
  return (req, res, next) => {
    if (req.user.role < accessRole) {
      throw ForbiddenException("Forbidden Account");
    }
    next();
  };
};
