//every helper throws an Error, the status travels inside error.cause
export const ApplicationException = ({
  message = "error",
  status = 400,
  errors = undefined,
} = {}) => {
  throw new Error(message, { cause: { status, errors } });
};

export const BadException = (message = "Bad Request", errors) =>
  ApplicationException({ message, status: 400, errors });

export const UnAuthorizedException = (message = "UnAuthorized", errors) =>
  ApplicationException({ message, status: 401, errors });

export const ForbiddenException = (message = "Forbidden", errors) =>
  ApplicationException({ message, status: 403, errors });

export const NotFoundException = (message = "Not Found", errors) =>
  ApplicationException({ message, status: 404, errors });

export const ConflictException = (message = "Conflict", errors) =>
  ApplicationException({ message, status: 409, errors });

export const TooManyRequestException = (
  message = "Too Many Requests",
  errors,
) => ApplicationException({ message, status: 429, errors });

export const ServiceUnavailableException = (
  message = "Service Unavailable",
  errors,
) => ApplicationException({ message, status: 503, errors });
