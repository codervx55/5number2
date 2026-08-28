import { Resend } from "resend";

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set.");
  return new Resend(key);
}

/**
 * Sends a 6-digit verification code to the given email.
 *
 * NOTE: RESEND_FROM_EMAIL must be a domain you've verified in your Resend
 * account (Resend rejects sends from unverified domains) - see
 * https://resend.com/domains
 */
export async function sendVerificationCodeEmail(email: string, code: string) {
  const resend = resendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("RESEND_FROM_EMAIL is not set.");

  await resend.emails.send({
    from,
    to: email,
    subject: `${code} is your 5number verification code`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="font-size: 18px;">Verify your email</h2>
        <p style="color: #555; font-size: 14px;">Enter this code to finish creating your account:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; padding: 16px 0;">
          ${code}
        </div>
        <p style="color: #888; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}

export function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
