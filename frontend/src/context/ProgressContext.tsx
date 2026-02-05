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
