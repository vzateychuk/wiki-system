import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import multer from 'multer';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('[ERROR]', err.message);

  if (err instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      error: 'FILE_UPLOAD_ERROR',
      message: err.message,
    });
    return;
  }

  if (err.message.startsWith('INVALID_FILE_TYPE')) {
    res.status(415).json({
      success: false,
      error: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Только файлы изображений (JPEG, PNG, WEBP) разрешены для загрузки.',
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка сервера' : err.message,
  });
};
