import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from '../services/authService';
import { verifyJwt } from '../utils/tokens';
import { query } from '../db';
import { comparePassword, hashPassword } from '../utils/password';

const router: Router = createRouter();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const result = await registerUser(req.body);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка регистрации';
    res.status(400).json({ message });
  }
});

router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const result = await verifyEmail(req.body);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка подтверждения';
    res.status(400).json({ message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка входа';
    res.status(400).json({ message });
  }
});

router.post('/request-reset', async (req: Request, res: Response) => {
  try {
    await requestPasswordReset(req.body);
    res.json({ message: 'Инструкции отправлены на email' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка запроса сброса';
    res.status(400).json({ message });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    await resetPassword(req.body);
    res.json({ message: 'Пароль успешно изменён' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка сброса пароля';
    res.status(400).json({ message });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const userId = payload.userId;

    const users = await query<{
      id: number;
      email: string;
      name: string;
      is_verified: boolean;
      is_admin: boolean;
    }>(
      'SELECT id, email, name, is_verified, is_admin FROM users WHERE id = $1',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const user = users[0];
    if (!user.is_verified) {
      return res.status(403).json({ message: 'Email не подтверждён' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.is_admin,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка проверки сессии';
    res.status(401).json({ message });
  }
});

router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const userId = payload.userId;

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Введите текущий и новый пароль (не менее 8 символов)' });
    }

    const users = await query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (!users.length) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const ok = await comparePassword(currentPassword, users[0].password_hash);
    if (!ok) {
      return res.status(400).json({ message: 'Неверный текущий пароль' });
    }

    const newHash = await hashPassword(newPassword);
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, userId]
    );

    res.json({ message: 'Пароль успешно изменён' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка смены пароля';
    res.status(500).json({ message });
  }
});

export default router;
