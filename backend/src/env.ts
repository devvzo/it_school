import dotenv from 'dotenv';

dotenv.config();

export const PORT = Number(process.env.PORT) || 4000;
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
export const ENABLE_CODE_EXECUTION = process.env.ENABLE_CODE_EXECUTION === 'true';

export const SMTP_HOST = process.env.SMTP_HOST;
export const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
export const SMTP_USER = process.env.SMTP_USER;
export const SMTP_PASS = process.env.SMTP_PASS;
export const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@it-school.local';

if (!DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('[env] DATABASE_URL is not set. Backend will not be able to connect to PostgreSQL.');
}

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'dev-secret-change-me') {
  // eslint-disable-next-line no-console
  console.warn('[env] In production you MUST set a strong JWT_SECRET instead of the default value.');
}


