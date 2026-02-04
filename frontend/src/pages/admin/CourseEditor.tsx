import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';

interface Course {
  id: number;
  title: string;
  level: string;
  description: string;
  imageUrl: string | null;
  color: string | null;
  isActive: boolean;
}

interface Module {
  id: number;
  title: string;
  description: string | null;
  orderIndex: number;
}

const CourseEditor: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [canActivate, setCanActivate] = useState(false);

  useEffect(() => {
    if (id) {
      loadCourse();
      loadModules();
      checkCanActivate();
    }
  }, [id, token]);

  const checkCanActivate = async () => {
    try {
      const res = await axios.get<{ canActivate: boolean; reason?: string }>(
        `/api/admin/courses/${id}/can-activate`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCanActivate(res.data.canActivate);
      if (!res.data.canActivate && res.data.reason) {
        console.log('Курс нельзя активировать:', res.data.reason);
      }
    } catch (e) {
      console.error('Ошибка проверки активации:', e);
    }
  };

  const loadCourse = async () => {
    try {
      const res = await axios.get<Course>(`/api/admin/courses/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCourse(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      const res = await axios.get<Module[]>(`/api/admin/courses/${id}/modules`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setModules(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;

    try {
      const res = await axios.post<{ id: number }>(
        `/api/admin/courses/${id}/modules`,
        {
          title: newModuleTitle,
          description: newModuleDescription || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setNewModuleTitle('');
      setNewModuleTitle('');
      setNewModuleDescription('');
      setShowAddModule(false);
      await loadModules();
      await checkCanActivate();
    } catch (e: any) {
      console.error('Ошибка создания модуля:', e);
      alert(e?.response?.data?.message || 'Ошибка создания модуля');
    }
  };

  const handleDeleteModule = async (moduleId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить модуль? Все уроки в модуле также будут удалены.')) return;

    try {
      await axios.delete(`/api/admin/modules/${moduleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await loadModules();
      await checkCanActivate();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Ошибка удаления модуля');
    }
  };

  const handleDeleteCourse = async () => {
    if (!confirm('Удалить курс? Все модули и уроки также будут удалены.')) return;

    try {
      await axios.delete(`/api/admin/courses/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      navigate('/admin/courses');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Ошибка удаления курса');
    }
  };

  const handleToggleActive = async () => {
    if (!canActivate && !course?.isActive) {
      // Получаем причину, почему нельзя активировать
      try {
        const res = await axios.get<{ canActivate: boolean; reason?: string }>(
          `/api/admin/courses/${id}/can-activate`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const reason = res.data.reason === 'Нет модулей' 
          ? 'Нельзя активировать курс без модулей. Создайте хотя бы один модуль.'
          : res.data.reason === 'Есть модули без уроков'
          ? 'Нельзя активировать курс с модулями без уроков. В каждом модуле должен быть хотя бы один урок.'
          : 'Нельзя активировать курс. Проверьте, что все модули содержат уроки.';
        alert(reason);
      } catch (e) {
        alert('Нельзя активировать курс без модулей и уроков');
      }
      return;
    }

    try {
      await axios.put(
        `/api/admin/courses/${id}/activate`,
        { isActive: !course?.isActive },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await loadCourse();
      await checkCanActivate();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Ошибка активации курса');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-tg-text mb-4">Курс не найден</p>
          <button
            onClick={() => navigate('/admin/courses')}
            className="px-4 py-2 rounded-xl bg-tg-accent text-white hover:bg-tg-accent-soft transition-colors"
          >
            Назад к курсам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/courses')}
            className="text-tg-muted hover:text-tg-text mb-2 transition-colors"
          >
            ← Назад к курсам
          </button>
          <h1 className="text-2xl font-bold text-tg-text">{course.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-lg text-sm font-medium ${
              course.isActive
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {course.isActive ? 'Активен' : 'Неактивен'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleActive}
              disabled={!canActivate && !course.isActive}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                course.isActive
                  ? 'bg-red-500/90 hover:bg-red-500 text-white'
                  : canActivate
                  ? 'bg-emerald-500/90 hover:bg-emerald-500 text-white'
                  : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
              }`}
              title={!canActivate && !course.isActive ? 'Создайте модули и уроки для активации курса' : ''}
            >
              {course.isActive ? 'Деактивировать' : 'Активировать'}
            </button>
            <button
              onClick={handleDeleteCourse}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-red-500/90 hover:bg-red-500 text-white"
            >
              Удалить курс
            </button>
            {!canActivate && !course.isActive && (
              <span className="text-xs text-tg-muted">
                (Нужны модули и уроки)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-tg-bg-light rounded-2xl border border-tg-border/50 p-6" style={{ background: 'var(--tg-bg-light)' }}>
        <h2 className="text-lg font-semibold text-tg-text mb-4">Модули курса</h2>

        <div className="space-y-3 mb-4">
          {modules.map((module) => (
            <div
              key={module.id}
              className="p-4 rounded-xl bg-tg-bg border border-tg-border/50 hover:border-tg-accent/50 transition-all"
              style={{ background: 'var(--tg-bg)' }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(`/admin/modules/${module.id}/edit`)}
                >
                  <h3 className="font-semibold text-tg-text">{module.title}</h3>
                  {module.description && (
                    <p className="text-sm text-tg-muted mt-1">{module.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDeleteModule(module.id, e)}
                    className="p-2 text-red-400 hover:text-red-500 transition-colors"
                    title="Удалить модуль"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <svg className="w-5 h-5 text-tg-muted cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" onClick={() => navigate(`/admin/modules/${module.id}/edit`)}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!showAddModule ? (
          <button
            onClick={() => setShowAddModule(true)}
            className="w-full px-4 py-3 rounded-xl bg-tg-bg-secondary border border-tg-border/50 text-tg-text hover:bg-tg-hover transition-colors text-sm font-medium"
            style={{ background: 'var(--tg-bg-secondary)' }}
          >
            + Добавить модуль
          </button>
        ) : (
          <form onSubmit={handleAddModule} className="space-y-3 p-4 rounded-xl bg-tg-bg border border-tg-border/50" style={{ background: 'var(--tg-bg)' }}>
            <input
              type="text"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              placeholder="Название модуля *"
              required
              className="w-full px-4 py-2 rounded-xl bg-tg-bg-light border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20"
              style={{ background: 'var(--tg-bg-light)', border: '1px solid var(--tg-border)' }}
            />
            <textarea
              value={newModuleDescription}
              onChange={(e) => setNewModuleDescription(e.target.value)}
              placeholder="Описание модуля (необязательно)"
              rows={2}
              className="w-full px-4 py-2 rounded-xl bg-tg-bg-light border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20 resize-none"
              style={{ background: 'var(--tg-bg-light)', border: '1px solid var(--tg-border)' }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddModule(false);
                  setNewModuleTitle('');
                  setNewModuleDescription('');
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-tg-bg-secondary text-tg-text hover:bg-tg-hover transition-colors text-sm"
                style={{ background: 'var(--tg-bg-secondary)' }}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-xl bg-tg-accent hover:bg-tg-accent-soft text-white transition-colors text-sm font-semibold"
              >
                Создать
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CourseEditor;
