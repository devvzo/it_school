import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import crypto from 'crypto';
import { query } from '../db';
import { verifyJwt } from '../utils/tokens';
// import { sendEmail } from '../services/emailService'; // Отправка email отключена, ссылка выводится для ручной отправки

const router: Router = createRouter();

function getTodayMoscowLocal(): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const moscowMs = utcMs + 3 * 60 * 60_000; // UTC+3
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

// Получить список детей текущего родителя
router.get('/children', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const parentId = payload.userId;

    const children = await query<{
      id: number;
      child_id: number;
      child_name: string;
      child_email: string;
      created_at: Date;
    }>(
      `SELECT pc.id,
              u.id as child_id,
              u.name as child_name,
              u.email as child_email,
              pc.created_at
       FROM parent_children pc
       JOIN users u ON u.id = pc.child_id
       WHERE pc.parent_id = $1
       ORDER BY pc.created_at DESC`,
      [parentId]
    );

    res.json(
      children.map((c) => ({
        id: c.id,
        childId: c.child_id,
        name: c.child_name,
        email: c.child_email,
        createdAt: c.created_at.toISOString(),
      }))
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки детей';
    res.status(500).json({ message });
  }
});

// Создать запрос на добавление ребёнка
router.post('/invite', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const parentId = payload.userId;

    const { email, fullName } = req.body as { email?: string; fullName?: string };
    if (!email || !fullName) {
      return res.status(400).json({ message: 'Введите email и ФИО ребёнка' });
    }

    const childUsers = await query<{ id: number; name: string; email: string }>(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email]
    );

    if (childUsers.length === 0) {
      return res.status(404).json({ message: 'Пользователь с таким email не найден' });
    }

    const child = childUsers[0];
    if (child.name.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
      return res.status(400).json({ message: 'ФИО не совпадает с данными ученика' });
    }

    // Проверяем, нет ли уже связи
    const existingLink = await query<{ id: number }>(
      'SELECT id FROM parent_children WHERE parent_id = $1 AND child_id = $2',
      [parentId, child.id]
    );
    if (existingLink.length > 0) {
      return res.status(400).json({ message: 'Этот ученик уже добавлен' });
    }

    const tokenValue = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 дня

    await query(
      `INSERT INTO parent_child_invites (parent_id, child_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [parentId, child.id, tokenValue, expiresAt.toISOString()]
    );

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const confirmLink = `${baseUrl}/parent-invite/${tokenValue}`;

    // Отправка email закомментирована - ссылка выводится пользователю для ручной отправки
    // await sendEmail(
    //   child.email,
    //   'Запрос на родительский контроль в IT School',
    //   `Здравствуйте!
    //
    // Ваш родитель запросил доступ к просмотру вашего прогресса в IT School.
    //
    // Если вы согласны, перейдите по ссылке и подтвердите запрос:
    // ${confirmLink}
    //
    // Если вы не ожидали это письмо, просто проигнорируйте его.`
    // );

    res.json({
      message: 'Ссылка для подтверждения создана. Отправьте её ребёнку вручную.',
      inviteLink: confirmLink,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка создания инвайта';
    res.status(500).json({ message });
  }
});

// Получить информацию по инвайту (для ребёнка)
router.get('/invite/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const invites = await query<{
      id: number;
      parent_id: number;
      child_id: number;
      expires_at: Date;
      accepted: boolean | null;
      parent_name: string;
      child_name: string;
    }>(
      `SELECT pci.id,
              pci.parent_id,
              pci.child_id,
              pci.expires_at,
              pci.accepted,
              p.name as parent_name,
              c.name as child_name
       FROM parent_child_invites pci
       JOIN users p ON p.id = pci.parent_id
       JOIN users c ON c.id = pci.child_id
       WHERE pci.token = $1`,
      [token]
    );

    if (invites.length === 0) {
      return res.status(404).json({ message: 'Приглашение не найдено' });
    }

    const invite = invites[0];
    if (invite.accepted === true) {
      return res.status(400).json({ message: 'Приглашение уже подтверждено' });
    }
    if (invite.expires_at.getTime() < Date.now()) {
      return res.status(400).json({ message: 'Срок действия приглашения истёк' });
    }

    res.json({
      parentName: invite.parent_name,
      childName: invite.child_name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки приглашения';
    res.status(500).json({ message });
  }
});

// Подтвердить или отклонить приглашение ребёнком
router.post('/invite/:token/respond', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { action } = req.body as { action?: 'accept' | 'reject' };

    if (action !== 'accept' && action !== 'reject') {
      return res.status(400).json({ message: 'Неверное действие' });
    }

    const invites = await query<{
      id: number;
      parent_id: number;
      child_id: number;
      expires_at: Date;
      accepted: boolean | null;
    }>(
      `SELECT id, parent_id, child_id, expires_at, accepted
       FROM parent_child_invites
       WHERE token = $1`,
      [token]
    );

    if (invites.length === 0) {
      return res.status(404).json({ message: 'Приглашение не найдено' });
    }

    const invite = invites[0];

    if (invite.expires_at.getTime() < Date.now()) {
      return res.status(400).json({ message: 'Срок действия приглашения истёк' });
    }

    if (invite.accepted !== null) {
      return res.status(400).json({ message: 'Приглашение уже обработано' });
    }

    if (action === 'accept') {
      await query(
        `INSERT INTO parent_children (parent_id, child_id)
         VALUES ($1, $2)
         ON CONFLICT (parent_id, child_id) DO NOTHING`,
        [invite.parent_id, invite.child_id]
      );
      await query(
        `UPDATE parent_child_invites
         SET accepted = true, responded_at = NOW()
         WHERE id = $1`,
        [invite.id]
      );
      return res.json({ message: 'Доступ успешно предоставлен' });
    }

    // reject
    await query(
      `UPDATE parent_child_invites
       SET accepted = false, responded_at = NOW()
       WHERE id = $1`,
      [invite.id]
    );
    return res.json({ message: 'Запрос отклонён' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка обработки приглашения';
    res.status(500).json({ message });
  }
});

function calcMinXpLocal(streakDays: number): number {
  return streakDays <= 1 ? 50 : Math.floor(50 * Math.pow(1.25, streakDays - 1));
}

// Детальная информация по ребёнку для родителя
router.get('/children/:childId/overview', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const parentId = payload.userId;

    const childId = Number(req.params.childId);
    if (!childId || Number.isNaN(childId)) {
      return res.status(400).json({ message: 'Неверный ID ребёнка' });
    }

    // Проверяем, что этот ребёнок действительно привязан к родителю
    const links = await query<{ id: number }>(
      'SELECT id FROM parent_children WHERE parent_id = $1 AND child_id = $2',
      [parentId, childId]
    );
    if (links.length === 0) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    const users = await query<{ id: number; name: string; email: string }>(
      'SELECT id, name, email FROM users WHERE id = $1',
      [childId]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'Ученик не найден' });
    }
    const child = users[0];

    // Прогресс по ударным дням — считаем по той же логике,
    // что и основной /api/progress, чтобы "минимальное количество XP"
    // совпадало у ребёнка и у родителя.
    const today = getTodayMoscowLocal();
    const progressRows = await query<{
      streak_days: number;
      last_activity_date: string | null;
      today_xp: number;
    }>(
      'SELECT streak_days, last_activity_date, today_xp FROM user_progress WHERE user_id = $1',
      [childId]
    );

    let streakDays = 0;
    let todayXp = 0;
    let minXp = 50;
    let dayNumber = 1;
    let completedToday = false;

    if (progressRows.length > 0) {
      const progress = progressRows[0];
      const lastDate = progress.last_activity_date
        ? String(progress.last_activity_date).slice(0, 10)
        : null;

      streakDays = progress.streak_days;
      todayXp = Number(progress.today_xp) || 0;

      if (lastDate !== today) {
        const yesterdayStr = addDaysLocal(today, -1);

        const yesterdayLog = await query<{ xp: number }>(
          'SELECT xp FROM daily_xp_logs WHERE user_id = $1 AND date = $2',
          [childId, yesterdayStr]
        );
        const yesterdayXp = yesterdayLog.length > 0 ? Number(yesterdayLog[0].xp) || 0 : 0;
        const yesterdayMinXp = calcMinXpLocal(progress.streak_days);

        if (lastDate === yesterdayStr && yesterdayXp >= yesterdayMinXp) {
          streakDays = progress.streak_days + 1;
        } else {
          streakDays = 1;
        }

        todayXp = 0;
      }

      minXp = calcMinXpLocal(streakDays);
      dayNumber = Math.max(1, streakDays || 1);
      completedToday = todayXp >= minXp;
    }

    // Прогресс по курсам
    const courseRows = await query<{
      course_id: number;
      title: string;
      level: string;
      description: string;
      image_url: string | null;
      duration: string | null;
      total_lessons: number;
      completed_lessons: number;
    }>(
      `
      SELECT
        c.id AS course_id,
        c.title,
        c.level,
        c.description,
        c.image_url,
        c.duration,
        COUNT(l.id) AS total_lessons,
        COUNT(CASE WHEN ulp.completed THEN 1 END) AS completed_lessons
      FROM user_course_enrollments uce
      JOIN courses c ON c.id = uce.course_id
      LEFT JOIN course_modules m ON m.course_id = c.id
      LEFT JOIN course_lessons l ON l.module_id = m.id
      LEFT JOIN user_lesson_progress ulp
        ON ulp.lesson_id = l.id AND ulp.user_id = uce.user_id
      WHERE uce.user_id = $1
      GROUP BY c.id, c.title, c.level, c.description, c.image_url, c.duration
      ORDER BY c.title
      `,
      [childId]
    );

    const courses = courseRows.map((c) => ({
      id: c.course_id,
      title: c.title,
      level: c.level,
      description: c.description,
      imageUrl: c.image_url,
      duration: c.duration,
      totalLessons: Number(c.total_lessons) || 0,
      completedLessons: Number(c.completed_lessons) || 0,
    }));

    res.json({
      child: {
        id: child.id,
        name: child.name,
        email: child.email,
      },
      streak: {
        streakDays,
        dayNumber,
        todayXp,
        minXp,
        completedToday,
      },
      courses,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки данных ребёнка';
    res.status(500).json({ message });
  }
});

export default router;

