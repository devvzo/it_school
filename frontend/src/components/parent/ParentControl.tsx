import type { FC } from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../Spinner';
import ParentInviteModal from './ParentInviteModal';
import ParentChildDetailsModal from './ParentChildDetailsModal';

interface ChildItem {
  id: number;
  childId: number;
  name: string;
  email: string;
  createdAt: string;
}

const ParentControl: FC = () => {
  const { token } = useAuth();
  const [children, setChildren] = useState<ChildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedChild, setSelectedChild] = useState<ChildItem | null>(null);

  const loadChildren = async () => {
    try {
      const res = await axios.get<ChildItem[]>('/api/parents/children', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setChildren(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadChildren();
    } else {
      setLoading(false);
    }
  }, [token]);

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-tg-muted">Необходима авторизация</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-semibold">Родительский контроль</h2>
          <p className="text-xs sm:text-sm text-tg-muted">
            Добавьте аккаунты детей, чтобы видеть их курсы и прогресс.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className="px-3 sm:px-4 py-1.5 rounded-xl bg-tg-accent hover:bg-tg-accent-soft text-xs sm:text-sm font-semibold text-white transition-colors"
        >
          Добавить ребёнка
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner />
        </div>
      ) : children.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center text-sm text-tg-muted">
          Пока ни один аккаунт не привязан. Нажмите «Добавить ребёнка», чтобы отправить приглашение.
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 sm:space-y-3 pr-1 sm:pr-2">
          {children.map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-tg-border/40 bg-tg-bg-secondary/60 cursor-pointer hover:bg-tg-hover/70 transition-colors"
              onClick={() => setSelectedChild(child)}
            >
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-tg-text">{child.name}</div>
                <div className="text-xs text-tg-muted">{child.email}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-tg-muted">
                  Добавлен {new Date(child.createdAt).toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <ParentInviteModal
          onClose={() => setShowInvite(false)}
          onInvited={() => {
            setShowInvite(false);
            loadChildren();
          }}
        />
      )}

      {selectedChild && (
        <ParentChildDetailsModal
          childId={selectedChild.childId}
          onClose={() => setSelectedChild(null)}
        />
      )}
    </div>
  );
};

export default ParentControl;

