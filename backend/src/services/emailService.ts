import nodemailer from 'nodemailer';
import { SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from '../env';

let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
} else {
  // eslint-disable-next-line no-console
  console.warn(
    '[email] SMTP credentials are not fully set. Emails will be logged to console instead of being sent.'
  );
}

export async function sendEmail(to: string, subject: string, text: string) {
  if (!transporter) {
    // Fallback for dev: just log
    // eslint-disable-next-line no-console
    console.log('[email:dev]', { to, subject, text });
    return;
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
  });
}


