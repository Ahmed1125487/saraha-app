import { BadException } from "../common/exceptions/error.exception.js";

//validates the request with a zod schema shaped { body, query, params, files }
//the parsed data is stored in req.validate
export const validation = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body ?? {},
      query: req.query,
      params: req.params,
      files: req.files ?? (req.file ? [req.file] : undefined),
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      throw BadException("validation error", errors);
    }

    req.validate = result.data;
    next();
  };
};
