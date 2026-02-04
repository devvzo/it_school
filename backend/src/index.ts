import express from 'express';
import cors from 'cors';
import path from 'path';
import { PORT } from './env';
import authRouter from './routes/auth';
import coursesRouter from './routes/courses';
import progressRouter from './routes/progress';
import adminRouter from './routes/admin';
import parentsRouter from './routes/parents';
import uploadRouter from './routes/upload';
import codeExecutionRouter from './routes/codeExecution';
import questionProgressRouter from './routes/questionProgress';
import { resetDatabaseOnStartup } from './initDb';

async function bootstrap() {
  await resetDatabaseOnStartup();

  const app = express();

  app.use(
    cors({
      origin: ['http://localhost:5173'],
      credentials: true,
    })
  );
  app.use(express.json());

  // Статические файлы для загруженных изображений
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/courses', coursesRouter);
  app.use('/api/progress', progressRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/parents', parentsRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/code', codeExecutionRouter);
  app.use('/api/questions', questionProgressRouter);

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});

