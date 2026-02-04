import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface GlobalErrorDetail {
  status: number | null;
}

const GlobalErrorModal: FC = () => {
  const [open, setOpen] = useState(false);
  const [lastStatus, setLastStatus] = useState<number | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<GlobalErrorDetail>;
      setLastStatus(custom.detail?.status ?? null);
      setOpen(true);
    };

    window.addEventListener('global-api-error', handler as EventListener);
    return () => window.removeEventListener('global-api-error', handler as EventListener);
  }, []);

  return (
    <AnimatePresence>
      {open && (
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
            className="w-full max-w-md mx-auto rounded-3xl border shadow-[0_22px_50px_rgba(15,23,42,0.35)] p-4 sm:p-6 space-y-4"
            style={{
              background: 'var(--tg-bg-light)',
              border: '1px solid var(--tg-border)',
            }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
          >
            <h2 className="text-lg sm:text-xl font-bold">Что-то пошло не так</h2>
            <p className="text-sm text-tg-muted">
              Произошла ошибка при загрузке данных. Нажмите «Повторить попытку», чтобы попробовать ещё раз.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  window.location.reload();
                }}
                className="px-4 py-2.5 rounded-xl bg-tg-accent hover:bg-tg-accent-soft text-white text-xs sm:text-sm font-semibold transition-colors inline-flex items-center justify-center"
              >
                Повторить попытку
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalErrorModal;

