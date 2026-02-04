import { z } from 'zod';
import { query } from '../db';
import { hashPassword, comparePassword } from '../utils/password';
import { generateNumericCode, signJwt } from '../utils/tokens';
import { sendEmail } from './emailService';

const registerSchema = z.object({
  name: z.string().min(2, 'Введите имя и фамилию'),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const resetRequestSchema = z.object({
  email: z.string().email(),
});

const resetConfirmSchema = z.object({
  email: z.string().email(),
  token: z.string().min(6),
  password: z.string().min(8),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
export type ResetConfirmInput = z.infer<typeof resetConfirmSchema>;

export async function registerUser(input: RegisterInput) {
  const data = registerSchema.parse(input);

  const existing = await query<{ id: number; is_verified: boolean }>(
    'SELECT id, is_verified FROM users WHERE email = $1',
    [data.email]
  );
  if (existing.length && existing[0].is_verified) {
    throw new Error('Пользователь с таким email уже зарегистрирован');
  }

  const passwordHash = await hashPassword(data.password);

  let userId: number;
  if (existing.length) {
    const updated = await query<{ id: number }>(
      'UPDATE users SET name = $1, password_hash = $2, is_verified = false WHERE id = $3 RETURNING id',
      [data.name, passwordHash, existing[0].id]
    );
    userId = updated[0].id;
  } else {
    const created = await query<{ id: number }>(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [data.name, data.email, passwordHash]
    );
    userId = created[0].id;
  }

  const code = generateNumericCode(6);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  await query(
    'INSERT INTO email_verification_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
    [userId, code, expiresAt]
  );

  await sendEmail(
    data.email,
    'Код подтверждения регистрации в IT School',
    `Ваш код подтверждения: ${code}\n\nКод действителен 15 минут.`
  );

  return { message: 'Код подтверждения отправлен на указанную почту' };
}

export async function verifyEmail(input: VerifyInput) {
  const data = verifySchema.parse(input);

  const rows = await query<{ id: number; user_id: number; expires_at: Date; used: boolean }>(
    `SELECT id, user_id, expires_at, used
     FROM email_verification_codes
     WHERE code = $1
       AND user_id = (SELECT id FROM users WHERE email = $2)
     ORDER BY created_at DESC
     LIMIT 1`,
    [data.code, data.email]
  );

  if (!rows.length) {
    throw new Error('Неверный код подтверждения');
  }

  const record = rows[0];
  if (record.used) {
    throw new Error('Код уже использован');
  }
  if (new Date(record.expires_at) < new Date()) {
    throw new Error('Срок действия кода истёк');
  }

  await query('UPDATE email_verification_codes SET used = true WHERE id = $1', [record.id]);
  const users = await query<{ id: number; email: string; name: string }>(
    'UPDATE users SET is_verified = true WHERE id = $1 RETURNING id, email, name',
    [record.user_id]
  );

  const user = users[0];
  const token = signJwt({ userId: user.id });

  return {
    message: 'Email успешно подтверждён',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export async function loginUser(input: LoginInput) {
  const data = loginSchema.parse(input);

  const users = await query<{ id: number; password_hash: string; is_verified: boolean; name: string }>(
    'SELECT id, password_hash, is_verified, name FROM users WHERE email = $1',
    [data.email]
  );

  if (!users.length) {
    throw new Error('Пользователь не найден');
  }

  const user = users[0];
  const ok = await comparePassword(data.password, user.password_hash);
  if (!ok) {
    throw new Error('Неверный пароль');
  }

  if (!user.is_verified) {
    throw new Error('Подтвердите email перед входом');
  }

  const token = signJwt({ userId: user.id });
  const userRows = await query<{ is_admin: boolean }>('SELECT is_admin FROM users WHERE id = $1', [user.id]);
  return {
    token,
    user: {
      id: user.id,
      email: data.email,
      name: user.name,
      isAdmin: userRows[0]?.is_admin ?? false,
    },
  };
}

export async function requestPasswordReset(input: ResetRequestInput) {
  const data = resetRequestSchema.parse(input);
  const users = await query<{ id: number }>('SELECT id FROM users WHERE email = $1', [data.email]);

  if (!users.length) {
    // Не раскрываем существование пользователя
    return { message: 'Если такой email существует, мы отправили на него инструкцию' };
  }

  const userId = users[0].id;
  const token = generateNumericCode(6);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  await sendEmail(
    data.email,
    'Сброс пароля в IT School',
    `Ваш код для сброса пароля: ${token}\n\nКод действителен 15 минут.`
  );

  return { message: 'Если такой email существует, мы отправили на него инструкцию' };
}

export async function resetPassword(input: ResetConfirmInput) {
  const data = resetConfirmSchema.parse(input);

  const rows = await query<{ id: number; user_id: number; expires_at: Date; used: boolean }>(
    `SELECT id, user_id, expires_at, used
     FROM password_reset_tokens
     WHERE token = $1
       AND user_id = (SELECT id FROM users WHERE email = $2)
     ORDER BY created_at DESC
     LIMIT 1`,
    [data.token, data.email]
  );

  if (!rows.length) {
    throw new Error('Неверный код');
  }

  const record = rows[0];
  if (record.used) {
    throw new Error('Код уже использован');
  }
  if (new Date(record.expires_at) < new Date()) {
    throw new Error('Срок действия кода истёк');
  }

  const passwordHash = await hashPassword(data.password);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, record.user_id]);
  await query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [record.id]);

  return { message: 'Пароль успешно изменён' };
}


