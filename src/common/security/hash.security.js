import bcrypt from "bcrypt";
import { SALT } from "../../config.js";

export const hash = async (plainText, saltRounds = SALT) => {
  return await bcrypt.hash(plainText, saltRounds);
};

export const compare = async (plainText, cipherText) => {
  return await bcrypt.compare(plainText, cipherText);
};
