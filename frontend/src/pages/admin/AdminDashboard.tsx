import type { FC } from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard: FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<{ totalUsers: number } | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await axios.get<{ totalUsers: number }>('/api/admin/stats', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setStats(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    loadStats();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          className="bg-tg-bg-light rounded-2xl border border-tg-border/50 p-6 flex flex-col gap-2"
          style={{ background: 'var(--tg-bg-light)' }}
        >
          <h3 className="text-sm font-semibold text-tg-muted uppercase tracking-wide">
            Всего пользователей
          </h3>
          <p className="text-3xl font-bold text-tg-text">
            {stats?.totalUsers ?? '—'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
