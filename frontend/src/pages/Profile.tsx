import type { FC } from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import ParentControl from '../components/parent/ParentControl';

interface UserProfile {
  id: number;
  email: string;
  name: string;
}

const Profile: FC = () => {
  const { token } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'account' | 'parent'>('account');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await axios.get<{ user: UserProfile }>('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setProfile(res.data.user);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  if (!token) {
    return (
      <section className="flex-1 bg-tg-bg-light/80 rounded-xl sm:rounded-2xl md:rounded-3xl border border-tg-border/50 shadow-tg-md p-4 sm:p-5 md:p-6 flex items-center justify-center">
        <p className="text-tg-muted">Необходима авторизация</p>
      </section>
    );
  }

  return (
    <section className="flex-1 bg-tg-bg-light/80 rounded-xl sm:rounded-2xl md:rounded-3xl border border-tg-border/50 shadow-tg-md p-4 sm:p-5 md:p-6 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Профиль</h1>
          <p className="text-xs sm:text-sm text-tg-muted mt-1">Управляйте аккаунтом и родительским контролем</p>
        </div>
      </div>

      <div className="flex border border-tg-border/40 rounded-xl overflow-hidden mb-4 sm:mb-5 bg-tg-bg-secondary/60">
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
            activeTab === 'account'
              ? 'bg-tg-accent text-white'
              : 'text-tg-muted hover:text-tg-text'
          }`}
        >
          Аккаунт
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('parent')}
          className={`flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
            activeTab === 'parent'
              ? 'bg-tg-accent text-white'
              : 'text-tg-muted hover:text-tg-text'
          }`}
        >
          Родительский контроль
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner />
        </div>
      ) : activeTab === 'account' ? (
        <div className="space-y-6">
          <AccountSection profile={profile} />
        </div>
      ) : (
        <ParentControl />
      )}
    </section>
  );
};

export default Profile;

interface AccountSectionProps {
  profile: UserProfile | null;
}

const AccountSection: FC<AccountSectionProps> = ({ profile }) => {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!token) {
      setError('Необходима авторизация');
      return;
    }
    if (newPassword.length < 8) {
      setError('Новый пароль должен быть не короче 8 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setChanging(true);
    try {
      const res = await axios.post(
        '/api/auth/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message ?? 'Пароль успешно изменён');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка смены пароля');
    } finally {
      setChanging(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-tg-muted uppercase tracking-wide">Данные аккаунта</h2>
        {profile && (
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="text-tg-muted">Имя:</span>{' '}
              <span className="font-semibold text-tg-text">
                {profile.name.split(' ').slice(-1).join(' ')}
              </span>
            </div>
            <div>
              <span className="text-tg-muted">Фамилия:</span>{' '}
              <span className="font-semibold text-tg-text">
                {profile.name.split(' ').slice(0, -1).join(' ')}
              </span>
            </div>
            <div>
              <span className="text-tg-muted">Email:</span>{' '}
              <span className="font-semibold text-tg-text">{profile.email}</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-tg-muted uppercase tracking-wide">Смена пароля</h2>
        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tg-muted">Текущий пароль</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-tg-border/60 bg-tg-bg text-sm outline-none focus:ring-2 focus:ring-tg-accent/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tg-muted">Новый пароль</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-tg-border/60 bg-tg-bg text-sm outline-none focus:ring-2 focus:ring-tg-accent/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tg-muted">Повторите новый пароль</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-tg-border/60 bg-tg-bg text-sm outline-none focus:ring-2 focus:ring-tg-accent/30"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>
          )}
          {message && !error && (
            <p className="text-xs text-emerald-500 dark:text-emerald-400 font-medium">{message}</p>
          )}

          <button
            type="submit"
            disabled={changing}
            className="mt-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-tg-accent hover:bg-tg-accent-soft text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {changing ? 'Сохраняем...' : 'Изменить пароль'}
          </button>
        </form>
      </div>
    </>
  );
};

