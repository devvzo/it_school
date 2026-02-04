import type { FC, ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

interface ProgressData {
  streakDays: number;
  todayXp: number;
  minXp: number;
  lastActivityDate: string | null;
}

interface ProgressContextValue {
  progress: ProgressData | null;
  loading: boolean;
  refreshProgress: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

export const ProgressProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    if (!token) {
      setProgress(null);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get<ProgressData>('/api/progress', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setProgress(res.data);
    } catch (e) {
      console.error('Ошибка загрузки прогресса:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const refreshProgress = useCallback(async () => {
    await loadProgress();
  }, [loadProgress]);

  const addXp = useCallback(async (xp: number) => {
    if (!token) return;

    try {
      const res = await axios.post<{
        success: boolean;
        todayXp: number;
        streakDays: number;
        minXp: number;
        completed: boolean;
      }>(
        '/api/progress/add-xp',
        { xp },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Обновляем прогресс сразу после добавления XP - синхронно для мгновенного отображения
      setProgress((prev) => {
        if (!prev) {
          // Если прогресса еще нет, создаем его
          return {
            streakDays: res.data.streakDays,
            todayXp: res.data.todayXp, // Backend вернул уже правильное значение (сумма)
            minXp: res.data.minXp,
            lastActivityDate: new Date().toISOString().split('T')[0],
          };
        }
        // Используем значение от сервера, которое уже содержит добавленные XP
        // Backend должен вернуть prev.todayXp + xp для того же дня
        return {
          ...prev,
          todayXp: res.data.todayXp, // Backend вернул уже правильное значение (prev.todayXp + xp)
          streakDays: res.data.streakDays,
          minXp: res.data.minXp,
          lastActivityDate: new Date().toISOString().split('T')[0],
        };
      });
    } catch (e) {
      console.error('Ошибка добавления XP:', e);
      // В случае ошибки все равно обновляем прогресс
      await refreshProgress();
    }
  }, [token, refreshProgress]);

  return (
    <ProgressContext.Provider
      value={{
        progress,
        loading,
        refreshProgress,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = (): ProgressContextValue => {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error('useProgress must be used within ProgressProvider');
  }
  return ctx;
};
