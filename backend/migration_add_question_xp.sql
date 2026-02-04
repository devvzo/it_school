-- Добавляем поле xp_reward для вопросов
ALTER TABLE lesson_questions ADD COLUMN IF NOT EXISTS xp_reward INTEGER NOT NULL DEFAULT 5;
