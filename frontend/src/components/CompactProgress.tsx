import type { FC } from 'react';
import { motion } from 'framer-motion';
import { useProgress } from '../context/ProgressContext';

const CompactProgress: FC = () => {
  const { progress: progressData } = useProgress();
  
  if (!progressData) return null;
  
  const { streakDays, todayXp, minXp } = progressData;
  const progressPercent = Math.min((todayXp / minXp) * 100, 100);
  const isCompleted = todayXp >= minXp;

  const getStreakText = (days: number) => {
    const dayNumber = Math.max(1, days || 1);
    return `День ${dayNumber}`;
  };

  return (
    <>
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-tg-border/50 shrink-0 max-w-[52vw]"
        style={{ background: 'var(--tg-bg-secondary)' }}
        title={`${getStreakText(streakDays)} • ${todayXp}/${minXp}`}
      >
        <div className="flex items-center gap-1.5">
          {streakDays > 0 && <span className="text-xs">🔥</span>}
          <span className="text-[10px] font-semibold text-tg-text whitespace-nowrap">
            {getStreakText(streakDays)}
          </span>
        </div>
        <div className="flex-1 min-w-[52px] h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--tg-bg)' }}>
          <motion.div
            className="h-full rounded-full"
            style={
              isCompleted
                ? { background: 'var(--tg-success)' }
                : { background: 'linear-gradient(to right, var(--tg-accent), var(--tg-accent-soft))' }
            }
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <span 
          className={`text-[9px] xl:text-[10px] font-medium min-w-[35px] text-right whitespace-nowrap transition-colors ${
            isCompleted ? 'text-tg-success-text' : 'text-tg-muted'
          }`}
          style={isCompleted ? { color: 'var(--tg-success-text)' } : {}}
        >
          {todayXp}/{minXp}
        </span>
      </div>
    </>
  );
};

export default CompactProgress;
