import type { FC, PropsWithChildren, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import CompactProgress from './CompactProgress';
import BottomNav from './BottomNav';

interface LayoutProps extends PropsWithChildren {
  rightSlot?: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children, rightSlot }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { progress } = useProgress();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen text-tg-text flex flex-col transition-colors duration-300" style={{ background: 'var(--tg-gradient)' }}>
      <header 
        className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-tg-border/50 backdrop-blur-xl sticky top-0 z-20 transition-colors duration-300" 
        style={{ 
          backgroundColor: 'var(--tg-bg)', 
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
      >
        <Link
          to="/"
          className="flex items-center gap-2 sm:gap-3 min-w-0 group"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-tg-accent to-[var(--tg-accent-soft)] flex items-center justify-center shadow-tg-md shrink-0">
            <span className="text-white font-bold text-sm sm:text-base">IT</span>
          </div>
          {/* На телефоне скрываем подписи, оставляем только иконку */}
          <div className="hidden sm:flex flex-col leading-tight min-w-0">
            <span className="font-semibold tracking-tight text-xs sm:text-sm md:text-base truncate group-hover:text-tg-accent transition-colors">
              IT School
            </span>
            <span className="text-[9px] sm:text-[10px] md:text-[11px] text-tg-muted truncate">
              онлайн‑школа для детей
            </span>
          </div>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1 px-2 py-1 rounded-xl" style={{ background: 'var(--tg-bg-secondary)' }}>
            <Link
              to="/"
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActive('/')
                  ? 'text-tg-accent'
                  : 'text-tg-muted hover:text-tg-text'
              }`}
              style={{
                background: isActive('/') ? 'var(--tg-hover)' : 'transparent',
              }}
            >
              Доступные курсы
            </Link>
            <Link
              to="/my-courses"
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActive('/my-courses')
                  ? 'text-tg-accent'
                  : 'text-tg-muted hover:text-tg-text'
              }`}
              style={{
                background: isActive('/my-courses') ? 'var(--tg-hover)' : 'transparent',
              }}
            >
              Мои курсы
            </Link>
            <Link
              to="/profile"
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActive('/profile')
                  ? 'text-tg-accent'
                  : 'text-tg-muted hover:text-tg-text'
              }`}
              style={{
                background: isActive('/profile') ? 'var(--tg-hover)' : 'transparent',
              }}
            >
              Профиль
            </Link>
          </nav>
        )}

        {/* На телефоне показываем дневной прогресс по центру шапки */}
        {user && (
          <div className="flex-1 flex justify-center px-2 lg:hidden">
            <CompactProgress />
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
          {/* На десктопе прогресс справа, как раньше */}
          {user && (
            <div className="hidden lg:block">
              <CompactProgress />
            </div>
          )}
          
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-tg-bg-secondary border border-tg-border/50 flex items-center justify-center hover:bg-tg-hover transition-colors duration-200 shrink-0"
            aria-label={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-tg-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-tg-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          
          <div className="shrink-0">{rightSlot}</div>
        </div>
      </header>

      <main
        className="flex-1 flex justify-center px-2 sm:px-4 py-4 sm:py-6 pb-28 sm:pb-24 md:pb-8"
      >
        <div className="w-full max-w-6xl flex flex-col gap-4 sm:gap-6">{children}</div>
      </main>

      {user && <BottomNav />}
    </div>
  );
};

export default Layout;


