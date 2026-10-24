import { EventEmitter } from "node:events";
import { sendEmail } from "./send.email.js";
import { otpTemplate } from "./email.templates.js";

//the email is sent in the background so the request does not wait for smtp
export const emailEvent = new EventEmitter();

emailEvent.on("sendEmail", async ({ recipients, subject, data }) => {
  try {
    const title = data.title ?? subject.replaceAll("_", " ");
    await sendEmail({
      ...recipients,
      subject: title,
      text: `${title}: ${data.code}`,
      html: otpTemplate({ title, code: data.code }),
    });
  } catch (error) {
    console.log(error);
  }
});
