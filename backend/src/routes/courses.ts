import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { query } from '../db';
import { verifyJwt } from '../utils/tokens';

const router: Router = createRouter();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await query<{
      id: number;
      title: string;
      level: string;
      description: string;
      duration: string | null;
      students_count: number;
      color: string | null;
      image_url: string | null;
    }>(
      `SELECT 
         c.id,
         c.title,
         c.level,
         c.description,
         c.duration,
         COALESCE(
           c.students_count,
           (SELECT COUNT(*) FROM user_course_enrollments uce WHERE uce.course_id = c.id),
           0
         ) AS students_count,
         c.color,
         c.image_url
       FROM courses c
       WHERE c.is_active = true
       ORDER BY c.sort_order NULLS LAST, c.id DESC`
    );

    const data = rows.map((row) => ({
      id: row.id.toString(),
      title: row.title,
      level: row.level as 'Новичок' | 'Средний' | 'Продвинутый',
      description: row.description,
      duration: row.duration ?? '',
      studentsCount: row.students_count,
      color: row.color ?? 'linear-gradient(90deg, #2AABEE, #00FFB3)',
      imageUrl: row.image_url,
    }));

    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки курсов';
    res.status(500).json({ message });
  }
});

router.get('/my', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const userId = payload.userId;

    const rows = await query<{
      id: number;
      title: string;
      level: string;
      description: string;
      duration: string | null;
      students_count: number;
      color: string | null;
      image_url: string | null;
    }>(
      `SELECT 
         c.id,
         c.title,
         c.level,
         c.description,
         c.duration,
         COALESCE(
           c.students_count,
           (SELECT COUNT(*) FROM user_course_enrollments uce2 WHERE uce2.course_id = c.id),
           0
         ) AS students_count,
         c.color,
         c.image_url
       FROM courses c
       INNER JOIN user_course_enrollments uce ON c.id = uce.course_id
       WHERE uce.user_id = $1 AND c.is_active = true
       ORDER BY uce.enrolled_at DESC`,
      [userId]
    );

    const data = rows.map((row) => ({
      id: row.id.toString(),
      title: row.title,
      level: row.level as 'Новичок' | 'Средний' | 'Продвинутый',
      description: row.description,
      duration: row.duration ?? '',
      studentsCount: row.students_count,
      color: row.color ?? 'linear-gradient(90deg, #2AABEE, #00FFB3)',
      imageUrl: row.image_url,
    }));

    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки курсов';
    res.status(500).json({ message });
  }
});

// Мои курсы с агрегированным прогрессом по урокам
router.get('/my-with-progress', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const userId = payload.userId;

    const rows = await query<{
      course_id: number;
      title: string;
      level: string;
      description: string;
      image_url: string | null;
      duration: string | null;
      students_count: number;
      color: string | null;
      total_lessons: number;
      completed_lessons: number;
      last_enrolled_at: Date | null;
    }>(
      `
      SELECT
        c.id AS course_id,
        c.title,
        c.level,
        c.description,
        c.image_url,
        c.duration,
        COALESCE(
          c.students_count,
          (SELECT COUNT(*) FROM user_course_enrollments uce2 WHERE uce2.course_id = c.id),
          0
        ) AS students_count,
        c.color,
        COUNT(l.id) AS total_lessons,
        COUNT(CASE WHEN ulp.completed THEN 1 END) AS completed_lessons,
        MAX(uce.enrolled_at) AS last_enrolled_at
      FROM user_course_enrollments uce
      JOIN courses c ON c.id = uce.course_id
      LEFT JOIN course_modules m ON m.course_id = c.id
      LEFT JOIN course_lessons l ON l.module_id = m.id
      LEFT JOIN user_lesson_progress ulp
        ON ulp.lesson_id = l.id AND ulp.user_id = uce.user_id
      WHERE uce.user_id = $1 AND c.is_active = true
      GROUP BY c.id, c.title, c.level, c.description, c.image_url, c.duration, c.students_count, c.color
      ORDER BY last_enrolled_at DESC NULLS LAST
      `,
      [userId]
    );

    const data = rows.map((row) => ({
      id: row.course_id.toString(),
      title: row.title,
      level: row.level as 'Новичок' | 'Средний' | 'Продвинутый',
      description: row.description,
      duration: row.duration ?? '',
      studentsCount: Number(row.students_count) || 0,
      color: row.color ?? 'linear-gradient(90deg, #2AABEE, #00FFB3)',
      imageUrl: row.image_url,
      totalLessons: Number(row.total_lessons) || 0,
      completedLessons: Number(row.completed_lessons) || 0,
      progressPercent:
        Number(row.total_lessons) > 0
          ? Math.round((Number(row.completed_lessons || 0) / Number(row.total_lessons)) * 100)
          : 0,
    }));

    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки курсов';
    res.status(500).json({ message });
  }
});

// Получить курс с модулями и уроками для прохождения
router.get('/:courseId/learn', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const userId = payload.userId;

    const courseId = parseInt(req.params.courseId, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: 'Неверный ID курса' });
    }

    // Проверяем, что пользователь записан на курс
    const enrollments = await query<{ id: number }>(
      'SELECT id FROM user_course_enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    if (enrollments.length === 0) {
      return res.status(403).json({ message: 'Вы не записаны на этот курс' });
    }

    // Получаем курс
    const courses = await query<{
      id: number;
      title: string;
      level: string;
      description: string;
      image_url: string | null;
    }>('SELECT id, title, level, description, image_url FROM courses WHERE id = $1 AND is_active = true', [courseId]);

    if (courses.length === 0) {
      return res.status(404).json({ message: 'Курс не найден или неактивен' });
    }

    const course = courses[0];

    // Получаем модули
    const modules = await query<{
      id: number;
      title: string;
      description: string | null;
      order_index: number;
    }>('SELECT id, title, description, order_index FROM course_modules WHERE course_id = $1 ORDER BY order_index', [courseId]);

    // Считаем накопленный XP пользователя по курсу (сумма xp_earned по всем вопросам курса)
    const userCourseXpRows = await query<{ total: number | null }>(
      `SELECT SUM(uqp.xp_earned) as total
       FROM user_question_progress uqp
       INNER JOIN lesson_questions lq ON lq.id = uqp.question_id
       INNER JOIN course_lessons cl ON cl.id = lq.lesson_id
       INNER JOIN course_modules cm ON cm.id = cl.module_id
       WHERE uqp.user_id = $1 AND cm.course_id = $2`,
      [userId, courseId]
    );
    const userCourseXp = Number(userCourseXpRows[0]?.total) || 0;

    // Получаем модули
    const modulesWithLessons = await Promise.all(
      modules.map(async (module) => {
        const lessons = await query<{
          id: number;
          title: string;
          xp_reward: number;
          required_xp: number;
          order_index: number;
        }>(
          'SELECT id, title, xp_reward, required_xp, order_index FROM course_lessons WHERE module_id = $1 ORDER BY order_index',
          [module.id]
        );

        // Суммарный XP по заданиям для каждого урока модуля
        const lessonIds = lessons.map((l) => l.id);
        let xpByLesson: Record<number, number> = {};
        let questionProgressByLesson: Record<
          number,
          { totalQuestions: number; completedQuestions: number }
        > = {};

        if (lessonIds.length > 0) {
          const xpRows = await query<{ lesson_id: number; total: number | null }>(
            'SELECT lesson_id, SUM(xp_reward) as total FROM lesson_questions WHERE lesson_id = ANY($1) GROUP BY lesson_id',
            [lessonIds]
          );
          xpByLesson = xpRows.reduce((acc, row) => {
            acc[row.lesson_id] = Number(row.total) || 0;
            return acc;
          }, {} as Record<number, number>);

          // Считаем прогресс по вопросам для каждого урока:
          // если в урок добавили новые вопросы после того, как он был завершён,
          // completed станет false, пока не будут решены все текущие вопросы.
          const qProgRows = await query<{
            lesson_id: number;
            total_questions: number;
            completed_questions: number;
          }>(
            `SELECT
               lq.lesson_id,
               COUNT(*) AS total_questions,
               COUNT(CASE WHEN uqp.completed THEN 1 END) AS completed_questions
             FROM lesson_questions lq
             LEFT JOIN user_question_progress uqp
               ON uqp.question_id = lq.id AND uqp.user_id = $1
             WHERE lq.lesson_id = ANY($2)
             GROUP BY lq.lesson_id`,
            [userId, lessonIds]
          );

          questionProgressByLesson = qProgRows.reduce((acc, row) => {
            acc[row.lesson_id] = {
              totalQuestions: Number(row.total_questions) || 0,
              completedQuestions: Number(row.completed_questions) || 0,
            };
            return acc;
          }, {} as Record<number, { totalQuestions: number; completedQuestions: number }>);
        }

        // Проверяем прогресс для каждого урока
        const lessonsWithProgress = await Promise.all(
          lessons.map(async (lesson) => {
            const requiredXp = lesson.required_xp || 0;
            const unlocked = userCourseXp >= requiredXp;

            // Старое поле user_lesson_progress могло остаться от предыдущих попыток.
            // Теперь дополнительно проверяем, что все текущие вопросы урока
            // действительно решены.
            const lessonQuestionProg = questionProgressByLesson[lesson.id];
            let completed = false;

            if (lessonQuestionProg && lessonQuestionProg.totalQuestions > 0) {
              completed =
                lessonQuestionProg.completedQuestions >= lessonQuestionProg.totalQuestions;
            } else {
              // Если в уроке нет вопросов, опираемся на агрегированное поле (как раньше)
              const progress = await query<{ completed: boolean }>(
                'SELECT completed FROM user_lesson_progress WHERE user_id = $1 AND lesson_id = $2',
                [userId, lesson.id]
              );
              completed = progress[0]?.completed || false;
            }

            return {
              id: lesson.id,
              title: lesson.title,
              xpReward: xpByLesson[lesson.id] ?? 0,
              orderIndex: lesson.order_index,
              completed,
              requiredXp,
              unlocked,
            };
          })
        );

        return {
          id: module.id,
          title: module.title,
          description: module.description,
          orderIndex: module.order_index,
          lessons: lessonsWithProgress,
        };
      })
    );

    res.json({
      id: course.id,
      title: course.title,
      level: course.level,
      description: course.description,
      imageUrl: course.image_url,
      modules: modulesWithLessons,
      userCourseXp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки курса';
    res.status(500).json({ message });
  }
});

// Получить урок для прохождения
router.get('/lessons/:lessonId', async (req: Request, res: Response) => {
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

    // Получаем урок
    const lessons = await query<{
      id: number;
      module_id: number;
      title: string;
      content: string;
      xp_reward: number;
      order_index: number;
    }>('SELECT id, module_id, title, content, xp_reward, order_index FROM course_lessons WHERE id = $1', [lessonId]);

    if (lessons.length === 0) {
      return res.status(404).json({ message: 'Урок не найден' });
    }

    const lesson = lessons[0];

    // Проверяем доступ к уроку (пользователь должен быть записан на курс)
    const modules = await query<{ course_id: number }>('SELECT course_id FROM course_modules WHERE id = $1', [lesson.module_id]);
    if (modules.length === 0) {
      return res.status(404).json({ message: 'Модуль не найден' });
    }

    const enrollments = await query<{ id: number }>(
      'SELECT id FROM user_course_enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, modules[0].course_id]
    );
    if (enrollments.length === 0) {
      return res.status(403).json({ message: 'Вы не записаны на этот курс' });
    }

    // Получаем вопросы
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

    res.json({
      id: lesson.id,
      moduleId: lesson.module_id,
      title: lesson.title,
      content: lesson.content,
      xpReward: lesson.xp_reward,
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

// Отметить урок как выполненный (XP начисляются за каждое задание отдельно)
router.post('/lessons/:lessonId/complete', async (req: Request, res: Response) => {
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

    // Просто отмечаем урок как выполненный (XP уже начислены за каждое задание)
    await query(
      `INSERT INTO user_lesson_progress (user_id, lesson_id, completed, completed_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (user_id, lesson_id) 
       DO UPDATE SET completed = true, completed_at = NOW(), updated_at = NOW()`,
      [userId, lessonId]
    );

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка сохранения прогресса';
    res.status(500).json({ message });
  }
});

router.post('/:courseId/enroll', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const userId = payload.userId;

    const courseId = parseInt(req.params.courseId, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: 'Неверный ID курса' });
    }

    // Проверяем существование курса
    const courseRows = await query<{ id: number }>('SELECT id FROM courses WHERE id = $1 AND is_active = true', [
      courseId,
    ]);
    if (courseRows.length === 0) {
      return res.status(404).json({ message: 'Курс не найден' });
    }

    // Проверяем, не записан ли уже пользователь
    const enrollmentRows = await query<{ id: number }>(
      'SELECT id FROM user_course_enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (enrollmentRows.length > 0) {
      return res.status(400).json({ message: 'Вы уже записаны на этот курс' });
    }

    // Записываем на курс
    await query(
      'INSERT INTO user_course_enrollments (user_id, course_id) VALUES ($1, $2)',
      [userId, courseId]
    );

    res.json({ success: true, message: 'Вы успешно записались на курс' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка записи на курс';
    res.status(500).json({ message });
  }
});

export default router;
