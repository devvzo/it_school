import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Spinner from '../components/Spinner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Lesson {
  id: number;
  title: string;
  xpReward: number;
  orderIndex: number;
  completed: boolean;
  requiredXp?: number;
  unlocked?: boolean;
}

interface Module {
  id: number;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: Lesson[];
}

interface Course {
  id: number;
  title: string;
  level: string;
  description: string;
  imageUrl: string | null;
  modules: Module[];
  userCourseXp?: number;
}

const levelShortLabel: Record<string, string> = {
  Новичок: 'Новичкам',
  Средний: 'Тем, кто уже в теме',
  Продвинутый: 'Продвинутым',
};

const CourseLearn: FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId && token) {
      loadCourse();
    }
  }, [courseId, token]);

  const loadCourse = async () => {
    try {
      const res = await axios.get<Course>(`/api/courses/${courseId}/learn`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCourse(res.data);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        navigate('/my-courses');
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-tg-muted">Необходима авторизация</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-tg-text mb-4">Курс не найден</p>
          <Link
            to="/my-courses"
            className="px-4 py-2 rounded-xl bg-tg-accent text-white hover:bg-tg-accent-soft transition-colors"
          >
            Назад к курсам
          </Link>
        </div>
      </div>
    );
  }

  // Подсчитываем прогресс курса
  const allLessons = course.modules.flatMap(m => m.lessons);
  const completedLessons = allLessons.filter(l => l.completed).length;
  const totalLessons = allLessons.length;
  const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  const totalXp = allLessons.reduce(
    (sum, l) => sum + (l.completed ? Number(l.xpReward) || 0 : 0),
    0
  );
  const availableXp = allLessons.reduce(
    (sum, l) => sum + (Number(l.xpReward) || 0),
    0
  );

  // Находим следующий незавершенный урок
  const nextLesson = allLessons.find(l => !l.completed);
  const currentModule = nextLesson 
    ? course.modules.find(m => m.lessons.some(l => l.id === nextLesson.id))
    : null;

  const nextLessonId = nextLesson?.id ?? null;
  const isCourseCompleted = progressPercent >= 99;

  return (
    <div className="space-y-6">
      {/* Заголовок курса */}
      <div className="bg-tg-bg-light rounded-2xl border border-tg-border/50 p-6" style={{ background: 'var(--tg-bg-light)' }}>
        <div className="flex items-start gap-4 mb-4">
          {course.imageUrl && (
            <img
              src={course.imageUrl.startsWith('http') ? course.imageUrl : `http://localhost:4000${course.imageUrl}`}
              alt={course.title}
              className="w-24 h-24 rounded-xl object-cover"
            />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-tg-text mb-2">{course.title}</h1>
            <p className="text-tg-muted mb-3">{course.description}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 rounded-lg text-sm font-medium bg-tg-bg-secondary text-tg-text" style={{ background: 'var(--tg-bg-secondary)' }}>
                {levelShortLabel[course.level] ?? course.level}
              </span>
              <span className="px-3 py-1 rounded-lg text-sm font-medium bg-tg-accent/20 text-tg-accent">
                {totalXp}/{availableXp} XP
              </span>
            </div>
          </div>
        </div>

        {/* Прогресс-бар курса */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-tg-text">Прогресс курса</span>
            <span className="text-sm text-tg-muted">{completedLessons}/{totalLessons} уроков</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden bg-tg-bg" style={{ background: 'var(--tg-bg)' }}>
            <motion.div
              className={
                isCourseCompleted
                  ? 'h-full bg-tg-accent'
                  : 'h-full bg-gradient-to-r from-tg-accent to-tg-accent-soft'
              }
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Следующий урок */}
        {nextLesson && currentModule && (
          <div className="mt-4 p-4 rounded-xl bg-tg-accent/10 border border-tg-accent/30">
            <p className="text-sm text-tg-muted mb-2">Следующий урок:</p>
            <Link
              to={`/courses/${courseId}/lessons/${nextLesson.id}`}
              className="flex items-center justify-between group"
            >
              <div>
                <p className="font-semibold text-tg-text group-hover:text-tg-accent transition-colors">
                  {nextLesson.title}
                </p>
                <p className="text-xs text-tg-muted mt-1">
                  {currentModule.title} • +{nextLesson.xpReward} XP
                </p>
              </div>
              <svg className="w-5 h-5 text-tg-muted group-hover:text-tg-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {!nextLesson && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <p className="text-emerald-400 font-semibold">🎉 Курс завершен!</p>
            <p className="text-sm text-tg-muted mt-1">Вы прошли все уроки</p>
          </div>
        )}
      </div>

      {/* Модули */}
      <div className="space-y-4">
        {course.modules.map((module, moduleIndex) => {
          const moduleLessons = module.lessons;
          const moduleCompleted = moduleLessons.filter(l => l.completed).length;
          const moduleProgress = moduleLessons.length > 0 ? (moduleCompleted / moduleLessons.length) * 100 : 0;
          const moduleTotalXp = moduleLessons.reduce(
            (sum, l) => sum + (Number(l.xpReward) || 0),
            0
          );

          const isModuleCompleted = moduleProgress >= 99;

          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: moduleIndex * 0.1 }}
              className="bg-tg-bg-light rounded-2xl border border-tg-border/50 p-6"
              style={{ background: 'var(--tg-bg-light)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-tg-text mb-2">{module.title}</h2>
                  {module.description && (
                    <p className="text-tg-muted mb-3">{module.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-tg-muted">
                    <span>{moduleCompleted}/{moduleLessons.length} уроков</span>
                    <span>•</span>
                    <span>{moduleTotalXp} XP</span>
                  </div>
                </div>
              </div>

              {/* Прогресс модуля */}
              <div className="mb-4">
                <div className="w-full h-2 rounded-full overflow-hidden bg-tg-bg" style={{ background: 'var(--tg-bg)' }}>
                  <motion.div
                    className={
                      isModuleCompleted
                        ? 'h-full bg-tg-accent'
                        : 'h-full bg-gradient-to-r from-tg-accent to-tg-accent-soft'
                    }
                    initial={{ width: 0 }}
                    animate={{ width: `${moduleProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {module.lessons.map((lesson, lessonIndex) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (moduleIndex * 0.1) + (lessonIndex * 0.05) }}
                  >
                    {(() => {
                      // Разрешаем открывать: уже открытые по условию курса (unlocked) или уже завершенные уроки
                      const isUnlocked = lesson.completed || lesson.unlocked;
                      const isLocked = !isUnlocked && !lesson.completed;
                      const userCourseXp = course.userCourseXp ?? 0;
                      const requiredXp = lesson.requiredXp ?? 0;
                      const remainingXp = Math.max(0, requiredXp - userCourseXp);
                      const lessonProgressPercent =
                        requiredXp > 0 ? Math.min(100, (userCourseXp / requiredXp) * 100) : 0;
                      const Wrapper: any = isUnlocked ? Link : 'div';
                      return (
                        <Wrapper
                          {...(isUnlocked ? { to: `/courses/${courseId}/lessons/${lesson.id}` } : {})}
                          className={`block p-4 rounded-xl border transition-all group ${
                            lesson.completed
                              ? 'bg-emerald-500/10 border-emerald-500/50 hover:border-emerald-500/70'
                              : isUnlocked
                              ? 'bg-tg-bg border-tg-border/50 hover:border-tg-accent/50'
                              : 'bg-tg-bg-secondary border-tg-border/30 opacity-60 cursor-not-allowed'
                          }`}
                          style={{
                            background: lesson.completed
                              ? 'rgba(16, 185, 129, 0.1)'
                              : isUnlocked
                              ? 'var(--tg-bg)'
                              : 'var(--tg-bg-secondary)',
                          }}
                          title={
                            isUnlocked
                              ? 'Открыть урок'
                              : remainingXp > 0
                              ? `Нужно ещё ${remainingXp} XP для доступа к уроку`
                              : 'Сначала пройдите предыдущие уроки'
                          }
                        >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {lesson.completed ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
                            >
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </motion.div>
                          ) : (
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isUnlocked ? 'border-tg-border' : 'border-tg-border/30'
                            }`}>
                              <span className="text-xs text-tg-muted">
                                {isUnlocked ? lesson.orderIndex : '🔒'}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={`font-medium block truncate ${
                              lesson.completed ? 'text-emerald-400' : 'text-tg-text group-hover:text-tg-accent'
                            } transition-colors`}>
                              {lesson.title}
                            </span>
                            <span className="text-xs text-tg-muted mt-0.5">
                              {`+${lesson.xpReward} XP`}
                            </span>

                            {isLocked && remainingXp > 0 && (
                              <div className="mt-1">
                                <div className="w-full h-1.5 rounded-full bg-tg-bg">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-tg-accent to-tg-accent-soft"
                                    style={{ width: `${lessonProgressPercent}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[10px] text-tg-muted mt-0.5">
                                  <span>{userCourseXp} XP</span>
                                  <span>{requiredXp} XP</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <svg className={`w-5 h-5 transition-colors flex-shrink-0 ${
                          isUnlocked ? 'text-tg-muted group-hover:text-tg-accent' : 'text-tg-muted/50'
                        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                        </Wrapper>
                      );
                    })()}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CourseLearn;
