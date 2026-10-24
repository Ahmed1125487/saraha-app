//sends the data as the response body
export const successResponse = ({ res, data = {}, status = 200 } = {}) => {
  return res.status(status).json(data);
};
