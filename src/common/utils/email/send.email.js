import nodemailer from "nodemailer";
import { APP_EMAIL, APP_PASSWORD, APPLICATION_NAME } from "../../../config.js";

//gmail needs an app password, not the account password
const transporter =
  APP_EMAIL && APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: APP_EMAIL, pass: APP_PASSWORD },
      })
    : null;

//errors are logged, never thrown
export const sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    console.log(`[email not configured] to: ${to} | ${subject} | ${text}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${APPLICATION_NAME}" <${APP_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.log("Error while sending mail:", error.message);
  }
};
