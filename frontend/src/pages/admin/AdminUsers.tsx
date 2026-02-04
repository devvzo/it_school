import type { FC } from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';

interface User {
  id: number;
  name: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
}

const AdminUsers: FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await axios.get<User[]>('/api/admin/users', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUsers(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [token]);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Поиск пользователей..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-xl bg-tg-bg border border-tg-border/50 text-tg-text placeholder:text-tg-muted focus:outline-none focus:ring-2 focus:ring-tg-accent/20"
          style={{ background: 'var(--tg-bg)', border: '1px solid var(--tg-border)' }}
        />
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="bg-tg-bg-light rounded-2xl border border-tg-border/50 overflow-hidden" style={{ background: 'var(--tg-bg-light)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-tg-border/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-tg-muted uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-tg-muted uppercase">Имя</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-tg-muted uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-tg-muted uppercase">Статус</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-tg-muted uppercase">Дата регистрации</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-tg-border/30 hover:bg-tg-hover transition-colors">
                    <td className="px-6 py-4 text-sm text-tg-text">{user.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-tg-text">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-tg-text">{user.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          user.isVerified
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {user.isVerified ? 'Подтверждён' : 'Не подтверждён'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-tg-muted">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-tg-muted">Пользователи не найдены</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
