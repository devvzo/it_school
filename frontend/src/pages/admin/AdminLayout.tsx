import type { FC } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminLayout: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tg-gradient)' }}>
        <div className="text-center">
          <p className="text-tg-text text-lg mb-4">Доступ запрещён</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-xl bg-tg-accent text-white hover:bg-tg-accent-soft transition-colors"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { path: '/admin', label: 'Главная' },
    { path: '/admin/users', label: 'Пользователи' },
    { path: '/admin/courses', label: 'Курсы' },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--tg-gradient)' }}>
      {/* Sidebar */}
      <aside
        className="w-full md:w-64 bg-tg-bg-light border-b md:border-b-0 md:border-r border-tg-border/50 flex flex-col shrink-0"
        style={{ background: 'var(--tg-bg-light)' }}
      >
        <div className="p-4 border-b border-tg-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tg-accent to-tg-accent-soft flex items-center justify-center text-white font-bold">
              IT
            </div>
            <span className="font-semibold text-tg-text hidden md:inline">Админ-панель</span>
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-row md:flex-col gap-2 md:gap-0 md:space-y-1.5 overflow-x-auto md:overflow-visible">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-tg-accent text-white shadow-sm'
                  : 'text-tg-muted hover:bg-tg-hover hover:text-tg-text'
              }`}
            >
              <span className="font-medium truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="hidden md:block p-4 border-t border-tg-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tg-accent to-tg-accent-soft flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-tg-text truncate">{user.name}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 rounded-xl bg-tg-bg-secondary hover:bg-tg-hover text-tg-text transition-colors text-sm font-medium"
          >
            На сайт
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-tg-bg-light border-b border-tg-border/50 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3 shrink-0">
          <h1 className="text-xl font-semibold text-tg-text">
            {menuItems.find((item) => isActive(item.path))?.label || 'Админ-панель'}
          </h1>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
