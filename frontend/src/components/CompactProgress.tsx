import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useProgress } from '../context/ProgressContext';

const CompactProgress: FC = () => {
  const { progress: progressData } = useProgress();
  
  if (!progressData) return null;
  
  const { streakDays, todayXp, minXp } = progressData;
  const progressPercent = Math.min((todayXp / minXp) * 100, 100);
  const isCompleted = todayXp >= minXp;

  const [animatedXp, setAnimatedXp] = useState(todayXp);
  const prevXpRef = useRef(todayXp);

  useEffect(() => {
    const start = prevXpRef.current;
    const end = todayXp;

    if (start === end) return;

    const duration = 300; // ms
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const value = Math.round(start + (end - start) * t);
      setAnimatedXp(value);
      if (t < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
    prevXpRef.current = todayXp;
  }, [todayXp]);

  const getStreakText = (days: number) => {
    const dayNumber = Math.max(1, days || 1);
    return `День ${dayNumber}`;
  };

  return (
    <>
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-tg-border/50 shrink-0 max-w-[56vw] shadow-tg-sm"
        style={{ background: 'var(--tg-bg-secondary)' }}
        title={`${getStreakText(streakDays)} • ${todayXp}/${minXp} XP`}
      >
        <div className="flex items-center gap-1.5">
          {streakDays > 0 && (
            <span className="text-[11px]" aria-hidden="true">
              🔥
            </span>
          )}
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
          className={`text-[9px] xl:text-[10px] font-semibold min-w-[42px] text-right whitespace-nowrap transition-colors ${
            isCompleted ? 'text-tg-success-text' : 'text-tg-muted'
          }`}
          style={isCompleted ? { color: 'var(--tg-success-text)' } : {}}
        >
          {animatedXp}/{minXp} XP
        </span>
      </div>
    </>
  );
};

export default CompactProgress;
