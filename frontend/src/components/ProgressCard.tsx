import type { FC } from 'react';
import { motion } from 'framer-motion';

interface ProgressCardProps {
  streakDays: number;
  todayXp: number;
  minXp: number;
  userName: string;
}

const ProgressCard: FC<ProgressCardProps> = ({ streakDays, todayXp, minXp, userName }) => {
  const progress = Math.min((todayXp / minXp) * 100, 100);
  const isCompleted = todayXp >= minXp;

  const getStreakText = (days: number) => {
    if (days === 0) return 'Начни серию дней обучения!';
    if (days === 1) return '1 день подряд';
    if (days < 5) return `${days} дня подряд`;
    if (days < 21) return `${days} дней подряд`;
    return `🔥 ${days} дней подряд!`;
  };

  return (
    <motion.div
      className="bg-tg-bg-light rounded-2xl sm:rounded-3xl border border-tg-border/50 shadow-tg-lg overflow-hidden transition-colors duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="p-6 sm:p-8 flex flex-col gap-5 sm:gap-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
              Привет, {userName}! 👋
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base text-tg-muted">
                {getStreakText(streakDays)}
              </span>
              {streakDays > 0 && (
                <span className="text-lg">🔥</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-tg-text">
              Твой прогресс по курсам за сегодня
            </span>
            <span 
              className={`text-xs font-medium transition-colors ${
                isCompleted ? 'text-tg-success-text' : 'text-tg-muted'
              }`}
              style={isCompleted ? { color: 'var(--tg-success-text)' } : {}}
            >
              {todayXp} / {minXp} XP
            </span>
          </div>
          
          <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'var(--tg-bg-secondary)' }}>
            <motion.div
              className="h-full rounded-full transition-all duration-500"
              style={
                isCompleted
                  ? { background: 'var(--tg-success)' }
                  : { background: 'linear-gradient(to right, var(--tg-accent), var(--tg-accent-soft))' }
              }
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {isCompleted && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <span className="text-xs font-bold text-white">✓ Выполнено!</span>
              </motion.div>
            )}
          </div>

          {!isCompleted && (
            <p className="text-xs text-tg-muted">
              Осталось {minXp - todayXp} XP до выполнения дневной цели
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProgressCard;
