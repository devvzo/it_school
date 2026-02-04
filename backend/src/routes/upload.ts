import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import multer from 'multer';
import path from 'path';
import { verifyJwt } from '../utils/tokens';
import { query } from '../db';
import fs from 'fs';

const router: Router = createRouter();

// Middleware для проверки админ-прав
const requireAdmin = async (req: Request, res: Response, next: () => void) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const token = authHeader.substring(7);
    const payload = verifyJwt(token);
    const userId = payload.userId;

    const users = await query<{ is_admin: boolean }>('SELECT is_admin FROM users WHERE id = $1', [userId]);

    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }

    next();
  } catch (err) {
    res.status(401).json({ message: 'Не авторизован' });
  }
};

// Настройка multer для загрузки файлов
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Разрешены только изображения (jpeg, jpg, png, gif, webp)'));
  },
});

router.post('/image', requireAdmin, upload.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не загружен' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка загрузки файла';
    res.status(500).json({ message });
  }
});

export default router;
