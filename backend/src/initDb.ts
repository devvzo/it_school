import fs from 'fs';
import path from 'path';
import { pool, query } from './db';

export async function resetDatabaseOnStartup() {
  if (!pool) {
    // eslint-disable-next-line no-console
    console.warn('[db] Skipping schema initialization - DATABASE_URL not set');
    return;
  }
  
  try {
    // Создаем таблицы если их нет (без удаления существующих)
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    // Убираем DROP TABLE команды из SQL
    const createSql = sql.split('\n').filter(line => !line.trim().startsWith('DROP TABLE')).join('\n');
    await query(createSql);
    // eslint-disable-next-line no-console
    console.log('[db] Schema initialized');
    
    // Применяем миграции
    try {
      await query('ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS xp_reward INTEGER NOT NULL DEFAULT 10');
      await query('ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS required_xp INTEGER NOT NULL DEFAULT 0');
      await query('ALTER TABLE lesson_questions ADD COLUMN IF NOT EXISTS xp_reward INTEGER NOT NULL DEFAULT 5');
      
      // Создаем таблицу прогресса по вопросам
      const migrationPath = path.join(__dirname, '..', 'migration_add_question_progress.sql');
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      await query(migrationSql);
      
      // eslint-disable-next-line no-console
      console.log('[db] Migrations applied');
    } catch (migrationErr) {
      // Колонки/таблицы уже существуют - это нормально
      // eslint-disable-next-line no-console
      console.log('[db] Migration check completed');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] Failed to initialize schema', err);
  }
}


