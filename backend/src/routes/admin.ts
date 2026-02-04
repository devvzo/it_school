import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { verifyJwt } from '../utils/tokens';
import { query } from '../db';

const router: Router = createRouter();

// Middleware для проверки админ-прав
const requireAdmin = async (req: Request, res: Response, next: () => void) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const userId = payload.userId;

    const users = await query<{ is_admin: boolean }>('SELECT is_admin FROM users WHERE id = $1', [userId]);

    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Не авторизован' });
  }
};

router.use(requireAdmin);

// Статистика
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const users = await query<{ count: string }>('SELECT COUNT(*) as count FROM users');
    res.json({ totalUsers: parseInt(users[0].count, 10) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки статистики';
    res.status(500).json({ message });
  }
});

// Список пользователей
router.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await query<{
      id: number;
      name: string;
      email: string;
      is_verified: boolean;
      created_at: Date;
    }>('SELECT id, name, email, is_verified, created_at FROM users ORDER BY created_at DESC');

    res.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isVerified: u.is_verified,
        createdAt: u.created_at.toISOString(),
      }))
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки пользователей';
    res.status(500).json({ message });
  }
});

// Список курсов
router.get('/courses', async (_req: Request, res: Response) => {
  try {
    const courses = await query<{
      id: number;
      title: string;
      level: string;
      description: string;
      image_url: string | null;
      is_active: boolean;
      created_at: Date;
    }>('SELECT id, title, level, description, image_url, is_active, created_at FROM courses ORDER BY created_at DESC');

    res.json(
      courses.map((c) => ({
        id: c.id,
        title: c.title,
        level: c.level,
        description: c.description,
        imageUrl: c.image_url,
        isActive: c.is_active,
        createdAt: c.created_at.toISOString(),
      }))
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки курсов';
    res.status(500).json({ message });
  }
});

// Создание курса
router.post('/courses', async (req: Request, res: Response) => {
  try {
    const { title, level, description, imageUrl, color } = req.body;

    if (!title || !level || !description) {
      return res.status(400).json({ message: 'Заполните все обязательные поля' });
    }

    const result = await query<{ id: number }>(
      `INSERT INTO courses (title, level, description, image_url, color, is_active)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id`,
      [title, level, description, imageUrl || null, color || 'linear-gradient(90deg, #2AABEE, #00FFB3)']
    );

    res.json({ id: result[0].id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка создания курса';
    res.status(500).json({ message });
  }
});

// Получить курс для редактирования
router.get('/courses/:id', async (req: Request, res: Response) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: 'Неверный ID курса' });
    }

    const courses = await query<{
      id: number;
      title: string;
      level: string;
      description: string;
      image_url: string | null;
      color: string | null;
      is_active: boolean;
    }>('SELECT id, title, level, description, image_url, color, is_active FROM courses WHERE id = $1', [courseId]);

    if (courses.length === 0) {
      return res.status(404).json({ message: 'Курс не найден' });
    }

    const course = courses[0];
    res.json({
      id: course.id,
      title: course.title,
      level: course.level,
      description: course.description,
      imageUrl: course.image_url,
      color: course.color,
      isActive: course.is_active,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки курса';
    res.status(500).json({ message });
  }
});

// Получить модули курса
router.get('/courses/:id/modules', async (req: Request, res: Response) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: 'Неверный ID курса' });
    }

    const modules = await query<{
      id: number;
      title: string;
      description: string | null;
      order_index: number;
    }>(
      'SELECT id, title, description, order_index FROM course_modules WHERE course_id = $1 ORDER BY order_index',
      [courseId]
    );

    res.json(
      modules.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        orderIndex: m.order_index,
      }))
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки модулей';
    res.status(500).json({ message });
  }
});

// Создать модуль
router.post('/courses/:id/modules', async (req: Request, res: Response) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: 'Неверный ID курса' });
    }

    // Проверяем существование курса
    const courses = await query<{ id: number }>('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (courses.length === 0) {
      return res.status(404).json({ message: 'Курс не найден' });
    }

    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Название модуля обязательно' });
    }

    // Получаем максимальный order_index
    const maxOrder = await query<{ max: number | null }>(
      'SELECT MAX(order_index) as max FROM course_modules WHERE course_id = $1',
      [courseId]
    );
    const nextOrder = (maxOrder[0]?.max ?? -1) + 1;

    const result = await query<{ id: number }>(
      'INSERT INTO course_modules (course_id, title, description, order_index) VALUES ($1, $2, $3, $4) RETURNING id',
      [courseId, title, description || null, nextOrder]
    );

    res.json({ id: result[0].id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка создания модуля';
    res.status(500).json({ message });
  }
});

// Получить модуль с уроками (должен быть после /courses/:id/modules)
router.get('/modules/:id', async (req: Request, res: Response) => {
  try {
    const moduleId = parseInt(req.params.id, 10);
    if (isNaN(moduleId)) {
      return res.status(400).json({ message: 'Неверный ID модуля' });
    }

    // eslint-disable-next-line no-console
    console.log('[admin] Запрос модуля с ID:', moduleId, 'params:', req.params);

    const modules = await query<{
      id: number;
      course_id: number;
      title: string;
      description: string | null;
      order_index: number;
    }>('SELECT id, course_id, title, description, order_index FROM course_modules WHERE id = $1', [moduleId]);

    // eslint-disable-next-line no-console
    console.log('[admin] Найдено модулей:', modules.length);

    if (modules.length === 0) {
      return res.status(404).json({ message: 'Модуль не найден' });
    }

    const module = modules[0];
    const lessons = await query<{
      id: number;
      title: string;
      content: string;
      xp_reward: number;
      required_xp: number;
      order_index: number;
    }>('SELECT id, title, content, xp_reward, required_xp, order_index FROM course_lessons WHERE module_id = $1 ORDER BY order_index', [moduleId]);

    // Считаем суммарный XP по вопросам для каждого урока
    const lessonIds = lessons.map((l) => l.id);
    let xpByLesson: Record<number, number> = {};
    if (lessonIds.length > 0) {
      const xpRows = await query<{ lesson_id: number; total: number | null }>(
        'SELECT lesson_id, SUM(xp_reward) as total FROM lesson_questions WHERE lesson_id = ANY($1) GROUP BY lesson_id',
        [lessonIds]
      );
      xpByLesson = xpRows.reduce((acc, row) => {
        acc[row.lesson_id] = Number(row.total) || 0;
        return acc;
      }, {} as Record<number, number>);
    }

    res.json({
      id: module.id,
      courseId: module.course_id,
      title: module.title,
      description: module.description,
      orderIndex: module.order_index,
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        content: l.content,
        xpReward: xpByLesson[l.id] ?? 0,
        requiredXp: l.required_xp,
        orderIndex: l.order_index,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки модуля';
    res.status(500).json({ message });
  }
});

// Создать урок
router.post('/modules/:id/lessons', async (req: Request, res: Response) => {
  try {
    const moduleId = parseInt(req.params.id, 10);
    if (isNaN(moduleId)) {
      return res.status(400).json({ message: 'Неверный ID модуля' });
    }

    const { title, content, requiredXp } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Название урока обязательно' });
    }

    // Получаем максимальный order_index
    const maxOrder = await query<{ max: number | null }>(
      'SELECT MAX(order_index) as max FROM course_lessons WHERE module_id = $1',
      [moduleId]
    );
    const nextOrder = (maxOrder[0]?.max ?? -1) + 1;

    // Определяем курс и суммарный XP по предыдущим урокам курса
    const moduleRows = await query<{ course_id: number }>(
      'SELECT course_id FROM course_modules WHERE id = $1',
      [moduleId]
    );
    if (moduleRows.length === 0) {
      return res.status(404).json({ message: 'Модуль не найден' });
    }
    const courseId = moduleRows[0].course_id;

    let defaultRequiredXp = 0;
    try {
      const sumRows = await query<{ total: number | null }>(
        `SELECT SUM(lq.xp_reward) as total
         FROM lesson_questions lq
         INNER JOIN course_lessons cl ON cl.id = lq.lesson_id
         INNER JOIN course_modules cm ON cm.id = cl.module_id
         WHERE cm.course_id = $1`,
        [courseId]
      );
      defaultRequiredXp = sumRows[0]?.total ?? 0;
    } catch {
      defaultRequiredXp = 0;
    }

    const finalRequiredXp =
      typeof requiredXp === 'number' && requiredXp >= 0 ? requiredXp : defaultRequiredXp;

    const result = await query<{ id: number }>(
      'INSERT INTO course_lessons (module_id, title, content, xp_reward, required_xp, order_index) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [moduleId, title, content || '', 0, finalRequiredXp, nextOrder]
    );

    res.json({ id: result[0].id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка создания урока';
    res.status(500).json({ message });
  }
});

// Получить урок с вопросами
router.get('/lessons/:id', async (req: Request, res: Response) => {
  try {
    const lessonId = parseInt(req.params.id, 10);
    if (isNaN(lessonId)) {
      return res.status(400).json({ message: 'Неверный ID урока' });
    }

    const lessons = await query<{
      id: number;
      module_id: number;
      title: string;
      content: string;
      xp_reward: number;
      required_xp: number;
      order_index: number;
    }>('SELECT id, module_id, title, content, xp_reward, required_xp, order_index FROM course_lessons WHERE id = $1', [lessonId]);

    if (lessons.length === 0) {
      return res.status(404).json({ message: 'Урок не найден' });
    }

    const lesson = lessons[0];
    const questions = await query<{
      id: number;
      question_text: string;
      question_type: string;
      correct_answer: string | null;
      options: any;
      code_template: string | null;
      expected_output: string | null;
      xp_reward: number;
      order_index: number;
    }>('SELECT id, question_text, question_type, correct_answer, options, code_template, expected_output, xp_reward, order_index FROM lesson_questions WHERE lesson_id = $1 ORDER BY order_index', [lessonId]);

    const totalLessonXp = questions.reduce(
      (sum, q) => sum + (Number(q.xp_reward) || 0),
      0
    );

    res.json({
      id: lesson.id,
      moduleId: lesson.module_id,
      title: lesson.title,
      content: lesson.content,
      xpReward: totalLessonXp,
      requiredXp: lesson.required_xp,
      orderIndex: lesson.order_index,
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.question_text,
        questionType: q.question_type,
        correctAnswer: q.correct_answer,
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
        codeTemplate: q.code_template,
        expectedOutput: q.expected_output,
        xpReward: q.xp_reward || 5,
        orderIndex: q.order_index,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки урока';
    res.status(500).json({ message });
  }
});

// Обновить урок
router.put('/lessons/:id', async (req: Request, res: Response) => {
  try {
    const lessonId = parseInt(req.params.id, 10);
    if (isNaN(lessonId)) {
      return res.status(400).json({ message: 'Неверный ID урока' });
    }

    const { title, content, requiredXp } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Название урока обязательно' });
    }

    await query(
      'UPDATE course_lessons SET title = $1, content = $2, required_xp = $3, updated_at = NOW() WHERE id = $4',
      [title, content || '', typeof requiredXp === 'number' && requiredXp >= 0 ? requiredXp : 0, lessonId]
    );

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка обновления урока';
    res.status(500).json({ message });
  }
});

// Создать вопрос
router.post('/lessons/:id/questions', async (req: Request, res: Response) => {
  try {
    const lessonId = parseInt(req.params.id, 10);
    if (isNaN(lessonId)) {
      return res.status(400).json({ message: 'Неверный ID урока' });
    }

    const { questionText, questionType, correctAnswer, options, codeTemplate, expectedOutput, xpReward } = req.body;
    if (!questionText || !questionType) {
      return res.status(400).json({ message: 'Текст вопроса и тип обязательны' });
    }

    // Получаем максимальный order_index
    const maxOrder = await query<{ max: number | null }>(
      'SELECT MAX(order_index) as max FROM lesson_questions WHERE lesson_id = $1',
      [lessonId]
    );
    const nextOrder = (maxOrder[0]?.max ?? -1) + 1;

    const result = await query<{ id: number }>(
      `INSERT INTO lesson_questions (lesson_id, question_text, question_type, correct_answer, options, code_template, expected_output, xp_reward, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [lessonId, questionText, questionType, correctAnswer || null, options ? JSON.stringify(options) : null, codeTemplate || null, expectedOutput || null, xpReward || 5, nextOrder]
    );

    res.json({ id: result[0].id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка создания вопроса';
    res.status(500).json({ message });
  }
});

// Обновить вопрос
router.put('/questions/:id', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.id, 10);
    if (isNaN(questionId)) {
      return res.status(400).json({ message: 'Неверный ID вопроса' });
    }

    const { questionText, questionType, correctAnswer, options, codeTemplate, expectedOutput, xpReward } = req.body;

    if (!questionText || !questionType) {
      return res.status(400).json({ message: 'Текст вопроса и тип обязательны' });
    }

    await query(
      `UPDATE lesson_questions 
       SET question_text = $1, question_type = $2, correct_answer = $3, options = $4, code_template = $5, expected_output = $6, xp_reward = $7
       WHERE id = $8`,
      [
        questionText,
        questionType,
        correctAnswer || null,
        options ? JSON.stringify(options) : null,
        codeTemplate || null,
        expectedOutput || null,
        xpReward || 5,
        questionId
      ]
    );

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка обновления вопроса';
    res.status(500).json({ message });
  }
});

// Удалить вопрос
router.delete('/questions/:id', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.id, 10);
    if (isNaN(questionId)) {
      return res.status(400).json({ message: 'Неверный ID вопроса' });
    }

    await query('DELETE FROM lesson_questions WHERE id = $1', [questionId]);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка удаления вопроса';
    res.status(500).json({ message });
  }
});

// Проверка возможности активации курса
router.get('/courses/:id/can-activate', async (req: Request, res: Response) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: 'Неверный ID курса' });
    }

    const modules = await query<{ id: number }>('SELECT id FROM course_modules WHERE course_id = $1', [courseId]);
    if (modules.length === 0) {
      return res.json({ canActivate: false, reason: 'Нет модулей' });
    }

    for (const module of modules) {
      const lessons = await query<{ id: number }>('SELECT id FROM course_lessons WHERE module_id = $1', [module.id]);
      if (lessons.length === 0) {
        return res.json({ canActivate: false, reason: 'Есть модули без уроков' });
      }
    }

    res.json({ canActivate: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка проверки';
    res.status(500).json({ message });
  }
});

// Активировать/деактивировать курс
router.put('/courses/:id/activate', async (req: Request, res: Response) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: 'Неверный ID курса' });
    }

    const { isActive } = req.body;

    // Проверяем возможность активации
    if (isActive) {
      const modules = await query<{ id: number }>('SELECT id FROM course_modules WHERE course_id = $1', [courseId]);
      if (modules.length === 0) {
        return res.status(400).json({ message: 'Нельзя активировать курс без модулей' });
      }

      for (const module of modules) {
        const lessons = await query<{ id: number }>('SELECT id FROM course_lessons WHERE module_id = $1', [module.id]);
        if (lessons.length === 0) {
          return res.status(400).json({ message: 'Нельзя активировать курс с модулями без уроков' });
        }
      }
    }

    await query('UPDATE courses SET is_active = $1 WHERE id = $2', [isActive, courseId]);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка активации курса';
    res.status(500).json({ message });
  }
});

// Удалить курс
router.delete('/courses/:id', async (req: Request, res: Response) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: 'Неверный ID курса' });
    }

    await query('DELETE FROM courses WHERE id = $1', [courseId]);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка удаления курса';
    res.status(500).json({ message });
  }
});

// Удалить модуль
router.delete('/modules/:id', async (req: Request, res: Response) => {
  try {
    const moduleId = parseInt(req.params.id, 10);
    if (isNaN(moduleId)) {
      return res.status(400).json({ message: 'Неверный ID модуля' });
    }

    await query('DELETE FROM course_modules WHERE id = $1', [moduleId]);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка удаления модуля';
    res.status(500).json({ message });
  }
});

// Удалить урок
router.delete('/lessons/:id', async (req: Request, res: Response) => {
  try {
    const lessonId = parseInt(req.params.id, 10);
    if (isNaN(lessonId)) {
      return res.status(400).json({ message: 'Неверный ID урока' });
    }

    await query('DELETE FROM course_lessons WHERE id = $1', [lessonId]);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка удаления урока';
    res.status(500).json({ message });
  }
});

export default router;
