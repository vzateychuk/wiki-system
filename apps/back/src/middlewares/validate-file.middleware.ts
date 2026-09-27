import { fileTypeFromFile } from 'file-type';
import fs from 'node:fs/promises';
import { Request, Response, NextFunction } from 'express';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export async function validateFileContent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const files = req.files as Express.Multer.File[];
  
  if (!files?.length) return next();

  for (const file of files) {
    const type = await fileTypeFromFile(file.path);
    
    if (!type || !ALLOWED_TYPES.includes(type.mime)) {
      // Удаляем загруженный мусор
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ 
        error: `Invalid file content: ${file.originalname}. Expected image, got ${type?.mime || 'unknown'}` 
      });
    }
    
    // Опционально: перезаписываем mimetype на реальный
    file.mimetype = type.mime;
  }
  
  next();
}