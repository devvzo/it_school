import type { FC, ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import Spinner from '../components/Spinner';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  isAdmin?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const STORAGE_KEY = 'it_school_auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ user: null, token: null });
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setIsChecking(false);
          return;
        }

        const parsed = JSON.parse(raw) as AuthState;
        if (!parsed.user || !parsed.token) {
          setIsChecking(false);
          return;
        }

        // Проверяем сессию на сервере
        try {
          const res = await axios.get<{ user: AuthUser }>('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${parsed.token}`,
            },
          });
          setState({ user: res.data.user, token: parsed.token });
        } catch (e) {
          // Токен невалидный или пользователь не найден - очищаем
          setState({ user: null, token: null });
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Ошибка парсинга - очищаем
        setState({ user: null, token: null });
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, []);

  const login = (user: AuthUser, token: string) => {
    const next: AuthState = { user, token };
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const logout = () => {
    setState({ user: null, token: null });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Показываем загрузку пока проверяем сессию
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tg-gradient)' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};


