import type { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav: FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-3 z-30 flex justify-center pointer-events-none"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
      }}
    >
      <div
        className="pointer-events-auto inline-flex items-center justify-between gap-2 px-4 py-2 rounded-full bg-tg-bg-light/80 border border-tg-border/40 shadow-[0_10px_30px_rgba(15,23,42,0.4)] backdrop-blur-md w-[calc(100%-32px)] max-w-2xl"
        style={{
          background: 'color-mix(in srgb, var(--tg-bg-light) 70%, transparent)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        <Link
          to="/"
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] sm:text-xs font-medium transition-colors duration-200 ${
            isActive('/')
              ? 'text-tg-accent'
              : 'text-tg-muted'
          }`}
          style={{
            background: isActive('/') ? 'var(--tg-hover)' : 'transparent',
          }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <span>Курсы</span>
        </Link>

        <Link
          to="/my-courses"
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] sm:text-xs font-medium transition-colors duration-200 ${
            isActive('/my-courses')
              ? 'text-tg-accent'
              : 'text-tg-muted'
          }`}
          style={{
            background: isActive('/my-courses') ? 'var(--tg-hover)' : 'transparent',
          }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>Мои курсы</span>
        </Link>

        <Link
          to="/profile"
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] sm:text-xs font-medium transition-colors duration-200 ${
            isActive('/profile')
              ? 'text-tg-accent'
              : 'text-tg-muted'
          }`}
          style={{
            background: isActive('/profile') ? 'var(--tg-hover)' : 'transparent',
          }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.121 17.804A4 4 0 019 16h6a4 4 0 013.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>Профиль</span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
