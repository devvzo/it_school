import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../components/Spinner';
import CourseCard, { type Course } from '../components/CourseCard';
import { useAuth } from '../context/AuthContext';

const MyCourses: FC = () => {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadMyCourses = async () => {
      if (!user || !token) {
        setCourses([]);
        return;
      }
      try {
        const res = await axios.get<Course[]>('/api/courses/my', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCourses(res.data);
      } catch (e) {
        console.error(e);
        setCourses([]);
      }
    };
    loadMyCourses();
  }, [user, token]);

  const hasCourses = courses && courses.length > 0;

  return (
    <section className="flex-1 bg-tg-bg-light/80 rounded-xl sm:rounded-2xl md:rounded-3xl border border-tg-border/50 shadow-tg-md p-4 sm:p-5 md:p-6 flex flex-col transition-colors duration-300 min-h-0">
      <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-tg-muted">
            Мои курсы
          </h2>
        </div>
        <span className="text-[10px] sm:text-xs text-tg-muted font-medium">
          {courses === null ? <Spinner size="sm" /> : hasCourses ? `${courses.length} курса` : 'Нет курсов'}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 space-y-2 sm:space-y-3">
        {courses === null && (
          <div className="space-y-2 sm:space-y-3">
            {[1, 2, 3].map((id) => (
              <div
                key={id}
                className="h-20 sm:h-24 rounded-xl sm:rounded-2xl bg-tg-bg-secondary animate-pulse border border-tg-border/40"
              />
            ))}
          </div>
        )}

        {courses !== null && hasCourses && courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onEnroll={() => navigate(`/courses/${course.id}/learn`)}
          />
        ))}

        {courses !== null && courses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center h-full">
            <p className="text-xs sm:text-sm font-semibold mb-2 text-tg-text">
              Вы ещё не записались ни на один курс
            </p>
            <p className="text-[10px] sm:text-xs max-w-sm text-tg-muted leading-relaxed px-4">
              Перейдите на страницу "Доступные курсы" и выберите интересующий вас курс для начала обучения.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default MyCourses;
