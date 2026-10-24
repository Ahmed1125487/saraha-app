import crypto from "node:crypto";
import { ENC_KEY } from "../../config.js";

//any ENC_KEY length works, we always derive a 32 bytes key from it
const key = crypto.createHash("sha256").update(ENC_KEY).digest();

//output: <iv hex>::<cipher hex>
export const encryption = (plaintext) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}::${encrypted.toString("hex")}`;
};

export const decryption = (encryptedData) => {
  if (!encryptedData) return null;

  const [iv, encryptedText] = encryptedData.split("::");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(iv, "hex"),
  );

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};
