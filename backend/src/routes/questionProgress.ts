import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { query } from '../db';
import { verifyJwt } from '../utils/tokens';
import { addXpForUser } from './progress';

const router: Router = createRouter();

// Сохранить прогресс по вопросу
router.post('/:questionId/complete', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const userId = payload.userId;

    const questionId = parseInt(req.params.questionId, 10);
    if (isNaN(questionId)) {
      return res.status(400).json({ message: 'Неверный ID вопроса' });
    }

    // Получаем фиксированное количество XP за вопрос из базы,
    // чтобы пользователь не мог "накрутить" XP через DevTools.
    const questionRows = await query<{ xp_reward: number }>(
      'SELECT xp_reward FROM lesson_questions WHERE id = $1',
      [questionId]
    );

    if (questionRows.length === 0) {
      return res.status(404).json({ message: 'Вопрос не найден' });
    }

    const rawXp = Number(questionRows[0].xp_reward);
    // Если в базе по какой-то причине 0 или null, даём дефолтные 5 XP,
    // чтобы задания всё равно начисляли опыт.
    const xp = rawXp && rawXp > 0 ? rawXp : 5;

    // Сохраняем прогресс вопроса
    await query(
      `INSERT INTO user_question_progress (user_id, question_id, completed, xp_earned, completed_at)
       VALUES ($1, $2, true, $3, NOW())
       ON CONFLICT (user_id, question_id) 
       DO UPDATE SET completed = true, xp_earned = $3, completed_at = NOW(), updated_at = NOW()`,
      [userId, questionId, xp]
    );

    // Начисляем дневной XP на сервере (user_progress.today_xp и daily_xp_logs)
    await addXpForUser(userId, xp);

    res.json({ success: true, xpEarned: xp });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка сохранения прогресса';
    res.status(500).json({ message });
  }
});

// Получить прогресс по вопросам урока
router.get('/lesson/:lessonId', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const userId = payload.userId;

    const lessonId = parseInt(req.params.lessonId, 10);
    if (isNaN(lessonId)) {
      return res.status(400).json({ message: 'Неверный ID урока' });
    }

    // Получаем все вопросы урока
    const questions = await query<{ id: number }>(
      'SELECT id FROM lesson_questions WHERE lesson_id = $1',
      [lessonId]
    );

    if (questions.length === 0) {
      return res.json({ progress: {} });
    }

    const questionIds = questions.map(q => q.id);

    // Получаем прогресс по этим вопросам
    const progressRows = await query<{
      question_id: number;
      completed: boolean;
      xp_earned: number;
    }>(
      `SELECT question_id, completed, xp_earned 
       FROM user_question_progress 
       WHERE user_id = $1 AND question_id = ANY($2::int[])`,
      [userId, questionIds]
    );

    const progress: Record<number, { completed: boolean; xpEarned: number }> = {};
    progressRows.forEach(row => {
      progress[row.question_id] = {
        completed: row.completed,
        xpEarned: row.xp_earned,
      };
    });

    res.json({ progress });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки прогресса';
    res.status(500).json({ message });
  }
});

export default router;
