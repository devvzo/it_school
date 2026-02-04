import type { FC } from 'react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onClose: () => void;
  onInvited: () => void;
}

const ParentInviteModal: FC<Props> = ({ onClose, onInvited }) => {
  const { token } = useAuth();
  const [email, setEmail] = useState('');
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoText, setInfoText] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setInfoText(null);
    setInviteLink(null);
    try {
      const res = await axios.post<{ message: string; inviteLink?: string }>(
        '/api/parents/invite',
        { email, fullName: `${childLastName.trim()} ${childFirstName.trim()}`.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setInfoText(res.data.message);
      if (res.data.inviteLink) {
        setInviteLink(res.data.inviteLink);
      }
    } catch (err: any) {
      setInfoText(err?.response?.data?.message ?? 'Ошибка отправки приглашения');
    } finally {
      setLoading(false);
    }
  };

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
          className="w-full max-w-md mx-auto rounded-3xl border shadow-[0_22px_50px_rgba(15,23,42,0.35)] p-4 sm:p-6 space-y-4"
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
              <h2 className="text-lg font-semibold">Добавить ребёнка</h2>
              <p className="text-xs sm:text-sm text-tg-muted mt-1.5">
                Введите email ученика и его ФИО так, как они указаны при регистрации. 
                После создания приглашения вы получите ссылку, которую нужно отправить ребёнку вручную.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-tg-bg-secondary border border-tg-border/50 flex items-center justify-center text-tg-muted hover:text-tg-text hover:bg-tg-hover transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-tg-muted">Email ребёнка</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-tg-border/60 bg-tg-bg outline-none text-sm placeholder:text-tg-muted focus:ring-2 focus:ring-tg-accent/30"
                placeholder="student@example.com"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-tg-muted">Фамилия ребёнка</label>
                <input
                  type="text"
                  required
                  value={childLastName}
                  onChange={(e) => setChildLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-tg-border/60 bg-tg-bg outline-none text-sm placeholder:text-tg-muted focus:ring-2 focus:ring-tg-accent/30"
                  placeholder="Иванов"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-tg-muted">Имя ребёнка</label>
                <input
                  type="text"
                  required
                  value={childFirstName}
                  onChange={(e) => setChildFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-tg-border/60 bg-tg-bg outline-none text-sm placeholder:text-tg-muted focus:ring-2 focus:ring-tg-accent/30"
                  placeholder="Иван"
                />
              </div>
            </div>

            {infoText && (
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-tg-muted bg-tg-bg-secondary/80 border border-tg-border/40 rounded-xl px-3 py-2">
                  {infoText}
                </p>
                {inviteLink && (
                  <div className="bg-tg-bg-secondary/80 border border-tg-border/40 rounded-xl px-3 py-2 space-y-2">
                    <p className="text-xs font-semibold text-tg-text">Ссылка для отправки ребёнку:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteLink}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-tg-border/60 bg-tg-bg text-xs text-tg-text font-mono"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteLink);
                          setInfoText('Ссылка скопирована в буфер обмена!');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-tg-accent hover:bg-tg-accent-soft text-xs font-semibold text-white transition-colors"
                      >
                        Копировать
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 rounded-xl border border-tg-border/60 text-xs sm:text-sm font-semibold text-tg-muted hover:text-tg-text hover:bg-tg-bg-secondary transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-xl bg-tg-accent hover:bg-tg-accent-soft text-xs sm:text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                )}
                <span>Отправить приглашение</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default ParentInviteModal;

