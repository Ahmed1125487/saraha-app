//html of the email that carries a one time code
export const otpTemplate = ({ title, code }) => {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table align="center" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #4a1c2b;border-radius:4px;">
    <tr><td style="background:#5c1a2e;color:#fff;text-align:center;padding:24px;font-size:40px;">&#9993;</td></tr>
    <tr><td style="text-align:center;padding:28px 20px 12px;">
      <h1 style="margin:0;font-size:24px;font-weight:500;color:#5c1a2e;">${title}</h1>
    </td></tr>
    <tr><td style="background:#5c1a2e;color:#fff;text-align:center;padding:16px;font-size:20px;letter-spacing:4px;">${code}</td></tr>
    <tr><td style="text-align:center;padding:20px;font-size:13px;color:#666;">If you did not ask for this code, ignore this email.</td></tr>
  </table>
</body>
</html>`;
};
