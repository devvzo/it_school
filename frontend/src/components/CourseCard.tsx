import type { FC } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export interface Course {
  id: string;
  title: string;
  level: 'Новичок' | 'Средний' | 'Продвинутый';
  description: string;
  duration: string;
  studentsCount?: number;
  color: string;
  imageUrl?: string | null;
  enrolled?: boolean;
}

interface CourseCardProps {
  course: Course;
  onEnroll?: () => void;
}

const levelColor: Record<Course['level'], string> = {
  Новичок: 'text-emerald-500 dark:text-emerald-400',
  Средний: 'text-blue-500 dark:text-blue-400',
  Продвинутый: 'text-purple-500 dark:text-purple-400',
};

const levelLabel: Record<Course['level'], string> = {
  Новичок: 'Новичкам',
  Средний: 'Тем, кто уже в теме',
  Продвинутый: 'Продвинутым',
};

const CourseCard: FC<CourseCardProps> = ({ course, onEnroll }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [isEnrolling, setIsEnrolling] = useState(false);

  const initials = course.title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const isMyCoursesPage = typeof window !== 'undefined' && window.location.pathname === '/my-courses';

  const getCtaLabel = () => {
    if (!user || !token) return 'Необходимо авторизоваться';
    if (isMyCoursesPage) return 'Перейти к курсу';
    if (course.enrolled) return 'Перейти';
    return 'Поступить на курс';
  };

  const handleClick = async () => {
    if (!user || !token) {
      // можно позже открыть модалку авторизации
      return;
    }

    if (isMyCoursesPage || course.enrolled) {
      navigate(`/courses/${course.id}/learn`);
      return;
    }

    if (onEnroll) {
      setIsEnrolling(true);
      try {
        await axios.post(
          `/api/courses/${course.id}/enroll`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        onEnroll();
        navigate('/my-courses');
      } catch (e: any) {
        // eslint-disable-next-line no-alert
        alert(e?.response?.data?.message ?? 'Ошибка записи на курс');
      } finally {
        setIsEnrolling(false);
      }
    }
  };

  return (
    <div className="w-full rounded-2xl bg-tg-bg-light/90 border border-tg-border/50 shadow-tg-sm hover:shadow-tg-md overflow-hidden transition-all duration-200 group">
      {/* Верхняя часть карточки */}
      <div className="flex items-center px-3.5 sm:px-4 pt-3.5 sm:pt-4 pb-2.5 sm:pb-3.5 gap-3 sm:gap-4">
        {course.imageUrl ? (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl overflow-hidden shrink-0 shadow-tg-md border border-tg-border/40">
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
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-bold text-white shrink-0 shadow-tg-md"
            style={{ background: course.color }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
            <h3 className="font-semibold text-xs sm:text-sm md:text-base leading-snug truncate text-tg-text group-hover:text-tg-accent transition-colors">
              {course.title}
            </h3>
            <span className="text-[9px] sm:text-[10px] font-medium text-tg-muted flex-shrink-0 bg-tg-bg-secondary/90 px-1.5 sm:px-2 py-0.5 rounded-md">
              {course.duration}
            </span>
          </div>
          <p className="text-[10px] sm:text-xs md:text-sm text-tg-muted mt-0.5 line-clamp-2 leading-relaxed">
            {course.description}
          </p>
          <div className="flex items-center justify-between mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] font-medium">
            <span
              className={`${levelColor[course.level]} px-1.5 py-0.5 rounded-md bg-tg-bg-secondary/80 max-w-[160px] truncate`}
            >
              {levelLabel[course.level]}
            </span>
            <span className="text-tg-muted text-[9px] sm:text-[10px] text-right">
              {(course.studentsCount ?? 0)} учени
              {(course.studentsCount ?? 0) === 1
                ? 'к'
                : (course.studentsCount ?? 0) < 5
                ? 'ка'
                : 'ков'}{' '}
              зарегистрировал
              {(course.studentsCount ?? 0) === 1 ? 'ся' : 'ись'} на курс
            </span>
          </div>
        </div>
      </div>

      {/* Разделитель */}
      <div className="h-px bg-gradient-to-r from-transparent via-tg-border/40 to-transparent mx-3 sm:mx-4 mb-2 sm:mb-2.5" />

      {/* Нижняя часть с кнопкой */}
      <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
        <button
          type="button"
          onClick={handleClick}
          disabled={isEnrolling || !user || !token}
          className={`w-full mt-1.5 sm:mt-2 inline-flex items-center justify-center px-3 py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
            course.enrolled || isMyCoursesPage
              ? 'bg-transparent text-tg-accent border-tg-accent hover:bg-tg-accent/5'
              : 'bg-tg-accent text-white border-tg-accent hover:bg-tg-accent-soft'
          }`}
        >
          {getCtaLabel()}
        </button>
      </div>
    </div>
  );
};

export default CourseCard;


