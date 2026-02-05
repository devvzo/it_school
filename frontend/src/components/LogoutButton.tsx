import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const LogoutButton: FC = () => {
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (showConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showConfirm]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    setShowConfirm(false);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowConfirm(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {showConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-tg-bg-light rounded-xl sm:rounded-2xl border border-tg-border/50 shadow-tg-lg p-4 sm:p-6 max-w-sm w-full mx-4"
            style={{ background: 'var(--tg-bg-light)', border: '1px solid var(--tg-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-tg-text">Подтверждение выхода</h3>
            <p className="text-xs sm:text-sm text-tg-muted mb-4 sm:mb-6">
              Вы уверены, что хотите выйти из аккаунта?
            </p>
            <div className="flex gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors duration-200 active:scale-95"
                style={{
                  background: 'var(--tg-bg-secondary)',
                  color: 'var(--tg-text)',
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white transition-colors duration-200 bg-red-500 hover:bg-red-600 active:scale-95"
              >
                Выйти
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="relative inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-tg-bg-light border border-tg-border/40 hover:border-tg-border/80 hover:bg-tg-hover active:scale-95 transition-all duration-200 shadow-tg-sm shrink-0 group">
        <span className="hidden sm:inline max-w-[110px] md:max-w-[170px] truncate font-medium text-[11px] sm:text-xs text-tg-muted group-hover:text-tg-text">
          {user.name}
        </span>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-red-500/90 hover:bg-red-500 active:bg-red-600 active:scale-95 text-white text-[11px] sm:text-xs font-semibold transition-all duration-200 shrink-0 shadow-sm hover:shadow-md"
          aria-label="Выйти из аккаунта"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H9m4 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
          </svg>
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </div>

      {mounted && createPortal(modalContent, document.body)}
    </>
  );
};

export default LogoutButton;
