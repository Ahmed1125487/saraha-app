import { BadException } from "../common/exceptions/error.exception.js";
import { checkFileType, fileValidation } from "../common/utils/index.js";

//runs multer, then checks the real type of every file
//the files are saved later by the service, after the request is validated
export const uploadMiddleware = ({
  multerMiddleware,
  validation = fileValidation.image,
  isRequired = false,
}) => {
  return (req, res, next) => {
    multerMiddleware(req, res, async (error) => {
      //multer errors: file too large, too many files, unexpected field
      if (error) {
        next(new Error(error.message, { cause: { status: 400 } }));
        return;
      }

      try {
        const files = req.file ? [req.file] : (req.files ?? []);
        if (isRequired && !files.length) throw BadException("file is required");

        await Promise.all(
          files.map((file) => checkFileType({ file, validation })),
        );
        next();
      } catch (error) {
        next(error);
      }
    });
  };
};
