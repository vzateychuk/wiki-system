import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { JevService } from './services/jev.service.js';
import { UploadService } from './services/upload.service.js';
import { UploadController } from './controllers/upload.controller.js';
import { uploadMiddleware } from './middlewares/upload.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();
const port = process.env.PORT || 3000;

// Определение переменных окружения
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const WIKI_BASE_DIR = process.env.WIKI_BASE_DIR || 'wiki';

if (!OPENROUTER_API_KEY) {
  console.error('[CRITICAL] Missing OPENROUTER_API_KEY environment variable');
  process.exit(1);
}

// Инициализация сервисов (Dependency Injection)
const jevService = new JevService(OPENROUTER_API_KEY);
const uploadProcessor = new UploadService(jevService, WIKI_BASE_DIR);
const uploadController = new UploadController(uploadProcessor);

// Базовые middleware безопасности и парсинга
app.use(helmet());
app.use(cors());
app.use(express.json());

// Маршруты
app.post(
  '/api/upload',
  uploadMiddleware.array('images', 10), // Ограничение до 10 файлов за раз
  async (req, res, next) => {
    try {
      // Обертка try/catch необходима в Express 4 для передачи асинхронных ошибок в errorHandler
      await uploadController.upload(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Глобальный обработчик ошибок (должен быть подключен последним)
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`[INFO] Server running at http://localhost:${port}`);
});

// Graceful Shutdown для корректного завершения работы при деплое/перезагрузке
process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[INFO] HTTP server closed');
    process.exit(0);
  });
});