import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface Lesson {
  id: number;
  title: string;
  content: string;
  xpReward: number;
  requiredXp: number;
  orderIndex: number;
}

interface Module {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: Lesson[];
}

const ModuleEditor: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  useEffect(() => {
    if (id) {
      loadModule();
    }
  }, [id, token]);

  const loadModule = async () => {
    if (!id) {
      console.error('ID модуля не указан');
      setLoading(false);
      return;
    }

    try {
      console.log('Загрузка модуля с ID:', id);
      const res = await axios.get<Module>(`/api/admin/modules/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Модуль загружен:', res.data);
      setModule(res.data);
    } catch (e: any) {
      console.error('Ошибка загрузки модуля:', e);
      console.error('URL запроса:', `/api/admin/modules/${id}`);
      console.error('Статус ответа:', e?.response?.status);
      console.error('Данные ответа:', e?.response?.data);
      if (e?.response?.status === 404) {
        // Модуль не найден - возможно был удален или ID неправильный
        console.error('Модуль с ID', id, 'не найден');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить урок? Все вопросы в уроке также будут удалены.')) return;

    try {
      await axios.delete(`/api/admin/lessons/${lessonId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      loadModule();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Ошибка удаления урока');
    }
  };

  const handleDeleteModule = async () => {
    if (!confirm('Удалить модуль? Все уроки в модуле также будут удалены.')) return;

    try {
      await axios.delete(`/api/admin/modules/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      navigate(`/admin/courses/${module?.courseId}/edit`);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Ошибка удаления модуля');
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;

    try {
      const res = await axios.post<{ id: number }>(
        `/api/admin/modules/${id}/lessons`,
        {
          title: newLessonTitle,
          content: '',
          xpReward: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setNewLessonTitle('');
      setShowAddLesson(false);
      loadModule();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-tg-muted">Загрузка...</div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-tg-text mb-4">Модуль не найден</p>
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
            onClick={() => navigate(`/admin/courses/${module.courseId}/edit`)}
            className="text-tg-muted hover:text-tg-text mb-2 transition-colors"
          >
            ← Назад к курсу
          </button>
          <h1 className="text-2xl font-bold text-tg-text">{module.title}</h1>
          {module.description && (
            <p className="text-tg-muted mt-2">{module.description}</p>
          )}
        </div>
        <button
          onClick={handleDeleteModule}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-red-500/90 hover:bg-red-500 text-white"
        >
          Удалить модуль
        </button>
      </div>

      <div className="bg-tg-bg-light rounded-2xl border border-tg-border/50 p-6" style={{ background: 'var(--tg-bg-light)' }}>
        <h2 className="text-lg font-semibold text-tg-text mb-4">Уроки модуля</h2>

        <div className="space-y-3 mb-4">
          {module.lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="p-4 rounded-xl bg-tg-bg border border-tg-border/50 hover:border-tg-accent/50 transition-all"
              style={{ background: 'var(--tg-bg)' }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(`/admin/lessons/${lesson.id}/edit`)}
                >
                  <h3 className="font-semibold text-tg-text">{lesson.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDeleteLesson(lesson.id, e)}
                    className="p-2 text-red-400 hover:text-red-500 transition-colors"
                    title="Удалить урок"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <svg className="w-5 h-5 text-tg-muted cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" onClick={() => navigate(`/admin/lessons/${lesson.id}/edit`)}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!showAddLesson ? (
          <button
            onClick={() => setShowAddLesson(true)}
            className="w-full px-4 py-3 rounded-xl bg-tg-bg-secondary border border-tg-border/50 text-tg-text hover:bg-tg-hover transition-colors text-sm font-medium"
            style={{ background: 'var(--tg-bg-secondary)' }}
          >
            + Добавить урок
          </button>
        ) : (
          <form onSubmit={handleAddLesson} className="space-y-3 p-4 rounded-xl bg-tg-bg border border-tg-border/50" style={{ background: 'var(--tg-bg)' }}>
            <input
              type="text"
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              placeholder="Название урока *"
              required
              className="w-full px-4 py-2 rounded-xl bg-tg-bg-light border border-tg-border/50 text-tg-text focus:outline-none focus:ring-2 focus:ring-tg-accent/20"
              style={{ background: 'var(--tg-bg-light)', border: '1px solid var(--tg-border)' }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddLesson(false);
                  setNewLessonTitle('');
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

export default ModuleEditor;
