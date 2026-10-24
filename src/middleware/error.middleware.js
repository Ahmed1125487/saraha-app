import { NODE_ENV } from "../config.js";

const getStatus = (error) => {
  const status = error.cause?.status ?? error.status ?? error.statusCode;
  if (Number.isInteger(status) && status >= 400 && status <= 599) return status;

  //mongoose / mongodb errors
  if (error.code === 11000) return 409;
  if (error.name === "CastError" || error.name === "ValidationError")
    return 400;

  return 500;
};

//must be the last middleware
export const globalErrorHandling = (error, req, res, next) => {
  const status = getStatus(error);
  const isServerError = status >= 500;
  const isProduction = NODE_ENV === "production";

  if (isServerError) console.log(error);

  return res.status(status).json({
    error_message:
      isServerError && isProduction
        ? "Internal server error"
        : error.message || "server error",
    ...(error.cause?.errors ? { errors: error.cause.errors } : {}),
    ...(isServerError && !isProduction ? { stack: error.stack } : {}),
  });
};
