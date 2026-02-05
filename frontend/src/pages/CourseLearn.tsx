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

const avatarColors = [
  '#0EA5E9',
  '#22C55E',
  '#A855F7',
  '#F97316',
  '#EC4899',
  '#6366F1',
];

const getAvatarColor = (title: string) => {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
};

const CourseLearn: FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const getCourseImageSrc = (imageUrl: string | null) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    const isDev = import.meta.env?.DEV;
    const base = isDev ? 'http://localhost:4000' : '';
    return `${base}${imageUrl}`;
  };

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
      <div className="bg-tg-bg-light rounded-2xl md:rounded-3xl border border-tg-border/50 p-5 md:p-6 shadow-tg-lg" style={{ background: 'var(--tg-bg-light)' }}>
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-5 mb-4">
          {course.imageUrl ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 shadow-tg-md border border-tg-border/40">
              <img
                src={getCourseImageSrc(course.imageUrl)}
                alt={course.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold text-white shrink-0 shadow-tg-md"
              style={{ background: getAvatarColor(course.title) }}
            >
              {course.title[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-tg-text leading-tight truncate">
                  {course.title}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-tg-muted line-clamp-2">
                  {course.description}
                </p>
              </div>
              <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-medium bg-tg-bg-secondary text-tg-text whitespace-nowrap" style={{ background: 'var(--tg-bg-secondary)' }}>
                {levelShortLabel[course.level] ?? course.level}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-tg-bg-secondary text-tg-text sm:hidden" style={{ background: 'var(--tg-bg-secondary)' }}>
                {levelShortLabel[course.level] ?? course.level}
              </span>
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-tg-accent/10 text-tg-accent">
                {totalXp}/{availableXp} XP по курсу
              </span>
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-tg-bg-secondary text-tg-muted" style={{ background: 'var(--tg-bg-secondary)' }}>
                {completedLessons}/{totalLessons} уроков завершено
              </span>
            </div>
          </div>
        </div>

        {/* Прогресс-бар курса */}
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-medium text-tg-text">
              Прогресс курса
            </span>
            <span className="text-xs sm:text-sm text-tg-muted">
              {Math.round(progressPercent)}% • {completedLessons}/{totalLessons} уроков
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden bg-tg-bg" style={{ background: 'var(--tg-bg)' }}>
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
        <div className="mt-4">
          {nextLesson && currentModule ? (
            <Link
              to={`/courses/${courseId}/lessons/${nextLesson.id}`}
              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-tg-accent/8 border border-tg-accent/30 hover:border-tg-accent/60 hover:bg-tg-accent/12 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-xs text-tg-muted mb-1">Следующий урок</p>
                <p className="font-semibold text-sm sm:text-base text-tg-text group-hover:text-tg-accent transition-colors truncate">
                  {nextLesson.title}
                </p>
                <p className="text-xs text-tg-muted mt-0.5 truncate">
                  {currentModule.title} • +{nextLesson.xpReward} XP
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="hidden sm:inline text-xs text-tg-muted">Перейти</span>
                <svg className="w-5 h-5 text-tg-muted group-hover:text-tg-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ) : (
            <div className="mt-2 p-3.5 rounded-2xl bg-emerald-500/8 border border-emerald-500/30 text-center">
              <p className="text-sm font-semibold text-emerald-400">Курс завершён</p>
              <p className="text-xs sm:text-sm text-tg-muted mt-1">
                Все уроки этого курса успешно пройдены.
              </p>
            </div>
          )}
        </div>
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
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-tg-muted">
                <span className="inline-flex px-2.5 py-1 rounded-full bg-tg-bg-secondary/80">
                  {moduleCompleted}/{moduleLessons.length} уроков
                </span>
                <span className="inline-flex px-2.5 py-1 rounded-full bg-tg-bg-secondary/80">
                  {moduleTotalXp} XP в модуле
                </span>
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
                              ? 'bg-emerald-500/10 border-emerald-500/60 hover:border-emerald-500'
                              : isUnlocked
                              ? 'bg-tg-bg border-tg-border/50 hover:border-tg-accent/60'
                              : 'bg-tg-bg-secondary border-tg-border/30 opacity-60 cursor-not-allowed'
                          }`}
                          style={{
                            background: lesson.completed
                              ? 'rgba(16, 185, 129, 0.08)'
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
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {lesson.completed ? (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-tg-md"
                                >
                                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </motion.div>
                              ) : (
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isUnlocked ? 'border-tg-border' : 'border-tg-border/30'
                                }`}>
                                  <span className="text-xs text-tg-muted">
                                    {isUnlocked ? lesson.orderIndex : '🔒'}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium block truncate text-sm ${
                                    lesson.completed ? 'text-emerald-400' : 'text-tg-text group-hover:text-tg-accent'
                                  } transition-colors`}>
                                    {lesson.title}
                                  </span>
                                  {lesson.completed && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                                      Выполнен
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-tg-muted mt-0.5 block">
                                  {`+${lesson.xpReward} XP`}
                                </span>

                                {isLocked && remainingXp > 0 && (
                                  <div className="mt-1.5">
                                    <div className="w-full h-1.5 rounded-full bg-tg-bg">
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-tg-accent to-tg-accent-soft"
                                        style={{ width: `${lessonProgressPercent}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-tg-muted mt-0.5">
                                      <span>{userCourseXp} XP</span>
                                      <span>{requiredXp} XP для доступа</span>
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
