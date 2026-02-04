import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { query } from '../db';
import { verifyJwt } from '../utils/tokens';

const router: Router = createRouter();

// Текущая дата по Москве (UTC+3), независимая от часового пояса сервера
function getTodayMoscow(): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const moscowMs = utcMs + 3 * 60 * 60_000; // +3 часа к UTC
  const d = new Date(moscowMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysLocal(yyyyMmDd: string, deltaDays: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function calcMinXp(streakDays: number): number {
  return streakDays <= 1 ? 50 : Math.floor(50 * Math.pow(1.25, streakDays - 1));
}

export interface UserXpResult {
  todayXp: number;
  streakDays: number;
  minXp: number;
  completed: boolean;
}

// Общая функция начисления XP пользователю.
// Используется как самим роутом /progress/add-xp, так и другими частями backend
// (например, при завершении задания).
export async function addXpForUser(userId: number, xp: number): Promise<UserXpResult> {
  if (!xp || typeof xp !== 'number' || xp <= 0) {
    throw new Error('Неверное количество XP');
  }

  const today = getTodayMoscow();

  // Получаем текущий прогресс
  const progressRows = await query<{
    streak_days: number;
    last_activity_date: string | null;
    today_xp: number;
  }>(
    `SELECT streak_days, last_activity_date, today_xp
       FROM user_progress
       WHERE user_id = $1`,
    [userId]
  );

  if (progressRows.length === 0) {
    await query(
      `INSERT INTO user_progress (user_id, streak_days, last_activity_date, today_xp)
           VALUES ($1, 1, $2, $3)`,
      [userId, today, xp]
    );
    await query(
      `INSERT INTO daily_xp_logs (user_id, date, xp)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, date) DO UPDATE SET xp = daily_xp_logs.xp + $3`,
      [userId, today, xp]
    );
    const minXp = calcMinXp(1);
    return {
      todayXp: xp,
      streakDays: 1,
      minXp,
      completed: xp >= minXp,
    };
  }

  const progress = progressRows[0];
  const lastDate = progress.last_activity_date
    ? String(progress.last_activity_date).slice(0, 10)
    : null;

  let newStreakDays = progress.streak_days;
  let newTodayXp: number;

  if (lastDate !== today) {
    // Новый день: сначала фиксируем rollover в базе так же, как GET /progress
    const yesterdayStr = addDaysLocal(today, -1);
    const yesterdayLog = await query<{ xp: number }>(
      `SELECT xp FROM daily_xp_logs WHERE user_id = $1 AND date = $2`,
      [userId, yesterdayStr]
    );
    const yesterdayXp = yesterdayLog.length > 0 ? Number(yesterdayLog[0].xp) || 0 : 0;
    const yesterdayMinXp = calcMinXp(progress.streak_days);

    if (lastDate === yesterdayStr && yesterdayXp >= yesterdayMinXp) {
      newStreakDays = progress.streak_days + 1;
    } else {
      newStreakDays = 1;
    }

    await query(
      `UPDATE user_progress
           SET today_xp = 0,
               last_activity_date = $1,
               streak_days = $2,
               updated_at = NOW()
           WHERE user_id = $3`,
      [today, newStreakDays, userId]
    );

    // Начинаем новый день с начисляемого XP
    newTodayXp = xp;
  } else {
    // Тот же день, добавляем XP к существующему значению
    const currentXpNowRows = await query<{ today_xp: number }>(
      `SELECT today_xp FROM user_progress WHERE user_id = $1`,
      [userId]
    );
    const currentXpNow = currentXpNowRows.length > 0 ? Number(currentXpNowRows[0].today_xp) || 0 : 0;
    newTodayXp = currentXpNow + xp;
  }

  // Вычисляем минимальный XP
  const minXp = calcMinXp(newStreakDays);

  // Обновляем прогресс
  await query(
    `UPDATE user_progress
         SET today_xp = $1, last_activity_date = $2, streak_days = $3, updated_at = NOW()
         WHERE user_id = $4`,
    [newTodayXp, today, newStreakDays, userId]
  );

  // Сохраняем в лог
  await query(
    `INSERT INTO daily_xp_logs (user_id, date, xp)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, date) DO UPDATE SET xp = daily_xp_logs.xp + $3`,
    [userId, today, xp]
  );

  return {
    todayXp: newTodayXp,
    streakDays: newStreakDays,
    minXp,
    completed: newTodayXp >= minXp,
  };
}

// Получить прогресс пользователя
router.get('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const userId = payload.userId;

    const today = getTodayMoscow();
    const rows = await query<{
      streak_days: number;
      last_activity_date: string | null;
      today_xp: number;
    }>(
      `SELECT streak_days, last_activity_date, today_xp
       FROM user_progress
       WHERE user_id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      // Создаем запись прогресса для нового пользователя
      await query(
        `INSERT INTO user_progress (user_id, streak_days, last_activity_date, today_xp)
         VALUES ($1, 0, NULL, 0)`,
        [userId]
      );
      return res.json({
        streakDays: 0,
        todayXp: 0,
        minXp: 50,
        lastActivityDate: null,
      });
    }

    const progress = rows[0];

    // last_activity_date в БД хранится как DATE (без времени),
    // поэтому берём только yyyy-mm-dd без преобразований часового пояса
    const lastDate = progress.last_activity_date
      ? String(progress.last_activity_date).slice(0, 10)
      : null;

    // Проверяем, нужно ли обновить день подряд
    let streakDays = progress.streak_days;
    let todayXp = Number(progress.today_xp) || 0;
    
    if (lastDate !== today) {
      // Новый день: определяем, продолжается ли серия по итогам ВЧЕРАШНЕГО дня,
      // и ОБЯЗАТЕЛЬНО фиксируем rollover в базе (today_xp=0, last_activity_date=today, streak_days=...).
      const yesterdayStr = addDaysLocal(today, -1);

      const yesterdayLog = await query<{ xp: number }>(
        `SELECT xp FROM daily_xp_logs WHERE user_id = $1 AND date = $2`,
        [userId, yesterdayStr]
      );
      const yesterdayXp = yesterdayLog.length > 0 ? Number(yesterdayLog[0].xp) || 0 : 0;
      const yesterdayMinXp = calcMinXp(progress.streak_days);

      if (lastDate === yesterdayStr && yesterdayXp >= yesterdayMinXp) {
        streakDays = progress.streak_days + 1;
      } else {
        streakDays = 1;
      }

      todayXp = 0;
      await query(
        `UPDATE user_progress
         SET today_xp = 0,
             last_activity_date = $1,
             streak_days = $2,
             updated_at = NOW()
         WHERE user_id = $3`,
        [today, streakDays, userId]
      );

      // Убедимся, что запись за сегодня есть (чтобы всё было "в базе")
      await query(
        `INSERT INTO daily_xp_logs (user_id, date, xp)
         VALUES ($1, $2, 0)
         ON CONFLICT (user_id, date) DO NOTHING`,
        [userId, today]
      );
    }

    const minXp = calcMinXp(streakDays);

    res.json({
      streakDays,
      todayXp,
      minXp,
      lastActivityDate: today,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки прогресса';
    res.status(500).json({ message });
  }
});

// Добавить XP за сегодня
router.post('/add-xp', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const userId = payload.userId;

    const { xp } = req.body;
    if (!xp || typeof xp !== 'number' || xp <= 0) {
      return res.status(400).json({ message: 'Неверное количество XP' });
    }

    const result = await addXpForUser(userId, xp);

    res.json({
      success: true,
      todayXp: result.todayXp,
      streakDays: result.streakDays,
      minXp: result.minXp,
      completed: result.completed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка обновления прогресса';
    res.status(500).json({ message });
  }
});

export default router;

