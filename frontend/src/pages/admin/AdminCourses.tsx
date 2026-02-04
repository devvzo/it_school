import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import CreateCourseModal from '../../components/admin/CreateCourseModal';

interface Course {
  id: number;
  title: string;
  level: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

const AdminCourses: FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadCourses();
  }, [token]);

  const loadCourses = async () => {
    try {
      const res = await axios.get<Course[]>('/api/admin/courses', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCourses(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseCreated = (courseId: number) => {
    setShowCreateModal(false);
    navigate(`/admin/courses/${courseId}/edit`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-tg-text">Курсы</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-tg-accent hover:bg-tg-accent-soft text-white font-semibold transition-colors"
        >
          + Создать курс
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const initials = course.title
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join('');

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                className="text-left w-full rounded-2xl bg-tg-bg-light/90 border border-tg-border/50 shadow-tg-sm hover:shadow-tg-md hover:border-tg-accent/60 overflow-hidden transition-all duration-200 group"
                style={{ background: 'var(--tg-bg-light)' }}
              >
                <div className="flex items-center px-3.5 pt-3.5 pb-2.5 gap-3">
                  {course.imageUrl ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-tg-md border border-tg-border/40">
                      <img
                        src={
                          course.imageUrl.startsWith('http')
                            ? course.imageUrl
                            : `http://localhost:4000${course.imageUrl}`
                        }
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-tg-md bg-tg-accent">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className="font-semibold text-xs sm:text-sm leading-snug truncate text-tg-text group-hover:text-tg-accent transition-colors">
                        {course.title}
                      </h3>
                      <span className="text-[9px] font-medium text-tg-muted flex-shrink-0 bg-tg-bg-secondary/90 px-1.5 py-0.5 rounded-md">
                        {course.level}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-tg-muted mt-0.5 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-[9px] font-medium">
                      <span
                        className={`px-1.5 py-0.5 rounded-md ${
                          course.isActive
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-gray-500/15 text-gray-400'
                        }`}
                      >
                        {course.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                      <span className="text-tg-muted">Редактировать курс →</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateCourseModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCourseCreated}
        />
      )}
    </div>
  );
};

export default AdminCourses;
