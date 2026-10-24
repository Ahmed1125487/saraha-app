import multer from "multer";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { fileTypeFromBuffer } from "file-type";

import { BadException } from "../../exceptions/error.exception.js";

export const fileValidation = {
  image: ["image/jpeg", "image/png", "image/gif"],
};

//files are kept in memory until the request is validated
export const localFileUpload = ({ maxFileSize = 5 } = {}) => {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSize * 1024 * 1024, files: 3 },
  });
};

//the type comes from the real bytes of the file, not from its name or mimetype
export const checkFileType = async ({ file, validation }) => {
  const result = await fileTypeFromBuffer(file.buffer);

  if (!result || !validation.includes(result.mime)) {
    throw BadException(`invalid file format: ${file.originalname}`);
  }
  file.ext = result.ext;
};

//returns the relative path of the saved file
export const saveFile = async ({ file, customPath = "general" }) => {
  await mkdir(resolve(`./assets/${customPath}`), { recursive: true });

  const filePath = `assets/${customPath}/${randomUUID()}.${file.ext}`;
  await writeFile(resolve(`./${filePath}`), file.buffer);

  return filePath;
};

export const saveFiles = async ({ files = [], customPath }) => {
  return await Promise.all(files.map((file) => saveFile({ file, customPath })));
};
