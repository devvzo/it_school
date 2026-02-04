import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Spinner from '../components/Spinner';
import CourseCard, { type Course } from '../components/CourseCard';
import { useAuth } from '../context/AuthContext';

const heroSlides = [
  {
    id: 'kids',
    title: 'Для детей 6–17 лет',
    text: 'Получай навыки программирования, дизайна и цифровых технологий с нуля. Уроки в игровой форме, мини‑проекты и поддержка наставника шаг за шагом.',
  },
  {
    id: 'parents',
    title: 'Для родителей',
    text: 'Через родительский контроль в личном кабинете вы можете отслеживать прогресс ребёнка по каждому курсу и видеть прозрачную статистику выполнения заданий.',
  },
];

const HeroBenefits: FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const activeSlide = heroSlides[activeIndex];

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="space-y-1.5"
        >
          <p className="inline-flex items-center px-2.5 py-1 rounded-full bg-tg-bg-secondary/80 text-[11px] sm:text-xs font-semibold text-tg-text">
            {activeSlide.title}
          </p>
          <p className="text-xs sm:text-sm md:text-base text-tg-muted leading-relaxed">
            {activeSlide.text}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-2 pt-1">
        {heroSlides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              index === activeIndex ? 'w-5 bg-tg-accent' : 'w-2 bg-tg-border/60'
            }`}
            aria-label={slide.title}
          />
        ))}
      </div>
    </div>
  );
};

const AvailableCourses: FC = () => {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const { user, token } = useAuth();

  const loadCourses = async () => {
    try {
      const res = await axios.get<Course[]>('/api/courses');
      let data = res.data;

      // Отмечаем курсы, на которые пользователь уже записан
      if (user && token) {
        try {
          const myRes = await axios.get<Course[]>('/api/courses/my', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const enrolledIds = new Set(myRes.data.map((c) => c.id));
          data = data.map((course) => ({
            ...course,
            enrolled: enrolledIds.has(course.id),
          }));
        } catch (e) {
          console.error('Ошибка загрузки записанных курсов', e);
        }
      }

      setCourses(data);
    } catch (e) {
      console.error(e);
      setCourses([]);
    }
  };

  const handleEnroll = () => {
    // Перезагружаем список курсов после записи
    void loadCourses();
  };

  useEffect(() => {
    void loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const hasCourses = courses && courses.length > 0;

  return (
    <>
      {!user && (
        <section className="bg-tg-bg-light rounded-xl sm:rounded-2xl md:rounded-3xl border border-tg-border/50 shadow-tg-lg overflow-hidden transition-colors duration-300">
          <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-5 md:gap-7">
            <div className="space-y-2 sm:space-y-3 max-w-3xl">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
                Онлайн IT‑школа для детей и подростков
              </h1>
              {/* Слайдер преимуществ: для детей / для родителей */}
              <HeroBenefits />
            </div>
          </div>
        </section>
      )}

      <section className="flex-1 bg-tg-bg-light/80 rounded-xl sm:rounded-2xl md:rounded-3xl border border-tg-border/50 shadow-tg-md p-4 sm:p-5 md:p-6 flex flex-col transition-colors duration-300 min-h-0">
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-5">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-tg-muted">
              Доступные курсы
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
            <CourseCard key={course.id} course={course} onEnroll={handleEnroll} />
          ))}

          {courses !== null && courses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center h-full">
              <p className="text-xs sm:text-sm font-semibold mb-2 text-tg-text">
                В данный момент нет доступных курсов
              </p>
              <p className="text-[10px] sm:text-xs max-w-sm text-tg-muted leading-relaxed px-4">
                Уже готовим для вас новые направления, обязательно вас уведомим.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default AvailableCourses;

