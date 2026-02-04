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
    // Увеличенные таймауты для медленных SMTP серверов
    connectionTimeout: 30000, // 30 секунд на подключение
    greetingTimeout: 30000, // 30 секунд на приветствие
    socketTimeout: 30000, // 30 секунд на операцию
    // Дополнительные опции для стабильности
    pool: true, // Использовать пул соединений
    maxConnections: 1,
    maxMessages: 3,
    // Для некоторых SMTP серверов нужно явно указать TLS
    requireTLS: SMTP_PORT === 587,
    tls: {
      rejectUnauthorized: false, // Для самоподписанных сертификатов (осторожно в продакшене!)
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

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] Failed to send email:', err);
    throw err;
  }
}

// Неблокирующая отправка email (для фоновых задач)
export function sendEmailAsync(to: string, subject: string, text: string): void {
  sendEmail(to, subject, text).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[email] Async email send failed:', err);
  });
}


