import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { verifyJwt } from '../utils/tokens';
import { ENABLE_CODE_EXECUTION } from '../env';

const execAsync = promisify(exec);
const router: Router = createRouter();

// Выполнить Python код
router.post('/execute', async (req: Request, res: Response) => {
  try {
    if (!ENABLE_CODE_EXECUTION) {
      return res.status(403).json({ message: 'Выполнение кода отключено на сервере' });
    }

    // Требуем авторизацию, чтобы анонимные пользователи не могли запускать код
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    try {
      // Проверяем токен, даже если userId далее не используется,
      // чтобы нельзя было вызывать эндпоинт без валидного JWT.
      verifyJwt(token);
    } catch {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'Код обязателен' });
    }

    // Создаем временный файл
    const fileName = `code_${randomUUID()}.py`;
    const filePath = join(process.cwd(), 'temp', fileName);
    
    // Создаем директорию temp если её нет
    try {
      await writeFile(filePath, code, 'utf8');
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // Директория не существует, создадим её
        const { mkdir } = require('fs/promises');
        await mkdir(join(process.cwd(), 'temp'), { recursive: true });
        await writeFile(filePath, code, 'utf8');
      } else {
        throw err;
      }
    }

    try {
      // Выполняем код с таймаутом 5 секунд
      // Пробуем python3, если не работает - python
      let stdout = '';
      let stderr = '';
      try {
        const result = await Promise.race([
          execAsync(`python3 "${filePath}"`, {
            timeout: 5000,
            maxBuffer: 1024 * 1024, // 1MB
          }),
          new Promise<{ stdout: string; stderr: string }>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: код выполняется слишком долго')), 5000)
          ),
        ]) as { stdout: string; stderr: string };
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (e: any) {
        // Если python3 не найден, пробуем python
        if (e.message?.includes('python3') || e.code === 'ENOENT' || e.message?.includes('Command failed')) {
          try {
            const result = await Promise.race([
              execAsync(`python "${filePath}"`, {
                timeout: 5000,
                maxBuffer: 1024 * 1024, // 1MB
              }),
              new Promise<{ stdout: string; stderr: string }>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: код выполняется слишком долго')), 5000)
              ),
            ]) as { stdout: string; stderr: string };
            stdout = result.stdout;
            stderr = result.stderr;
          } catch (e2: any) {
            throw e2;
          }
        } else {
          throw e;
        }
      }

      // Удаляем временный файл
      try {
        await unlink(filePath);
      } catch {
        // Игнорируем ошибки удаления
      }

      if (stderr) {
        return res.json({ output: stderr, error: true });
      }

      res.json({ output: stdout.trim(), error: false });
    } catch (error: any) {
      // Удаляем временный файл
      try {
        await unlink(filePath);
      } catch {
        // Игнорируем ошибки удаления
      }

      if (error.message.includes('Timeout')) {
        return res.status(400).json({ message: 'Код выполняется слишком долго (максимум 5 секунд)' });
      }

      res.status(400).json({ 
        message: 'Ошибка выполнения кода',
        error: error.message || 'Неизвестная ошибка'
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка выполнения кода';
    res.status(500).json({ message });
  }
});

export default router;
