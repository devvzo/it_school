import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../Spinner';

interface Props {
  childId: number;
  onClose: () => void;
}

interface ChildOverview {
  child: {
    id: number;
    name: string;
    email: string;
  };
  streak: {
    streakDays: number;
    dayNumber: number;
    todayXp: number;
    minXp: number;
    completedToday: boolean;
  };
  courses: Array<{
    id: number;
    title: string;
    level: string;
    description: string;
    imageUrl: string | null;
    duration: string | null;
    totalLessons: number;
    completedLessons: number;
  }>;
}

const ParentChildDetailsModal: FC<Props> = ({ childId, onClose }) => {
  const { token } = useAuth();
  const [data, setData] = useState<ChildOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('Необходима авторизация');
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get<ChildOverview>(`/api/parents/children/${childId}/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? 'Ошибка загрузки данных ребёнка');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [childId, token]);

  const modalContent = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex items-center justify-center px-3 sm:px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          background:
            'radial-gradient(circle at top, rgba(15, 23, 42, 0.28), transparent 55%), rgba(15, 23, 42, 0.28)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <motion.div
          className="w-full max-w-2xl mx-auto rounded-3xl border shadow-[0_22px_50px_rgba(15,23,42,0.35)] p-4 sm:p-6 space-y-4 sm:space-y-5"
          style={{
            background: 'var(--tg-bg-light)',
            border: '1px solid var(--tg-border)',
          }}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Прогресс ребёнка</h2>
              {data && (
                <p className="text-xs sm:text-sm text-tg-muted mt-1.5">
                  {data.child.name} • {data.child.email}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-tg-bg-secondary border border-tg-border/50 flex items-center justify-center text-tg-muted hover:text-tg-text hover:bg-tg-hover transition-colors"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : error ? (
            <div className="py-4 text-sm text-red-500 dark:text-red-400">
              {error}
            </div>
          ) : data ? (
            <div className="space-y-4 sm:space-y-5">
              {/* Ударный режим */}
              <div className="rounded-2xl border border-tg-border/50 bg-tg-bg-secondary/60 px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-semibold text-tg-muted uppercase tracking-wide">
                    Ударный режим
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-tg-text">
                    День {data.streak.dayNumber}{' '}
                    <span className="text-xs sm:text-sm text-tg-muted">
                      (серия: {data.streak.streakDays} дн.)
                    </span>
                  </p>
                  <p className="text-xs sm:text-sm text-tg-muted">
                    Сегодня: {data.streak.todayXp}/{data.streak.minXp} XP —{' '}
                    {data.streak.completedToday ? 'минимум выполнен' : 'минимум ещё не достигнут'}
                  </p>
                </div>
              </div>

              {/* Курсы */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-tg-muted uppercase tracking-wide">
                  Курсы и прогресс
                </p>
                {data.courses.length === 0 ? (
                  <p className="text-xs sm:text-sm text-tg-muted">
                    Ребёнок пока не записан ни на один курс.
                  </p>
                ) : (
                  <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto pr-1 sm:pr-2">
                    {data.courses.map((course) => {
                      const { totalLessons, completedLessons } = course;
                      const percent =
                        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                      return (
                        <div
                          key={course.id}
                          className="rounded-xl border border-tg-border/40 bg-tg-bg px-3 sm:px-4 py-2.5 sm:py-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-tg-text truncate">
                                {course.title}
                              </p>
                              <p className="text-[11px] text-tg-muted truncate">
                                {course.level} • {course.duration || 'Без указания длительности'}
                              </p>
                            </div>
                            <span className="text-[11px] font-medium text-tg-muted whitespace-nowrap">
                              {completedLessons}/{totalLessons} уроков
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-tg-bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percent}%`,
                                background:
                                  percent >= 100
                                    ? 'var(--tg-success)'
                                    : 'linear-gradient(to right, var(--tg-accent), var(--tg-accent-soft))',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default ParentChildDetailsModal;

