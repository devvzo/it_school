import type { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const iconTransition = {
  duration: 2.2,
  repeat: Infinity,
  repeatType: 'reverse' as const,
  ease: 'easeInOut' as const,
};

// Курсы — каталог (сетка), лёгкий пульс
const IconCourses = () => (
  <motion.svg
    className="w-5 h-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    initial={false}
    animate={{ scale: [1, 1.07, 1] }}
    transition={iconTransition}
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </motion.svg>
);

// Мои курсы — открытая книга, «дыхание»
const IconMyCourses = () => (
  <motion.svg
    className="w-5 h-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    initial={false}
    animate={{ scale: [1, 1.08, 1] }}
    transition={iconTransition}
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </motion.svg>
);

// Профиль — человек, лёгкий пульс
const IconProfile = () => (
  <motion.svg
    className="w-5 h-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    initial={false}
    animate={{ scale: [1, 1.06, 1] }}
    transition={iconTransition}
  >
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
  </motion.svg>
);

const navItems: { path: string; label: string; Icon: FC }[] = [
  { path: '/', label: 'Курсы', Icon: IconCourses },
  { path: '/my-courses', label: 'Мои курсы', Icon: IconMyCourses },
  { path: '/profile', label: 'Профиль', Icon: IconProfile },
];

const BottomNav: FC = () => {
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4 pt-2 pointer-events-none"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      aria-label="Основная навигация"
    >
      <div
        className="pointer-events-auto relative flex items-center justify-around gap-0 w-full max-w-md h-14 rounded-2xl border border-tg-border/50 shadow-tg-md transition-colors duration-300 overflow-hidden"
        style={{
          background: 'color-mix(in srgb, var(--tg-bg-light) 85%, transparent)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {navItems.map(({ path, label, Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 h-full py-2 px-2 rounded-xl text-[11px] sm:text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-tg-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:scale-[0.97]"
              style={{
                color: isActive ? 'var(--tg-accent)' : 'var(--tg-muted)',
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.span
                  className="absolute inset-1 rounded-xl"
                  layoutId="bottom-nav-pill"
                  style={{
                    background: 'var(--tg-hover)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-0 flex items-center justify-center w-6 h-6">
                <Icon />
              </span>
              <span className="relative z-0 truncate max-w-full">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
