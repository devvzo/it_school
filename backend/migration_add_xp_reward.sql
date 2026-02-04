-- Миграция: добавление колонки xp_reward в таблицу course_lessons
ALTER TABLE course_lessons 
ADD COLUMN IF NOT EXISTS xp_reward INTEGER NOT NULL DEFAULT 10;
