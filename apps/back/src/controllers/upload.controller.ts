import { Request, Response } from 'express';
import { UploadService } from '../services/upload.service.js';

export class UploadController {
  constructor(private readonly processor: UploadService) {}

  async upload(req: Request, res: Response) {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    // Process all images in parallel
    const results = await Promise.all(
      files.map(file => this.processor.process(file.path, file.originalname))
    );

    res.json({
      processed: results.filter(r => r.success),
      failed: results.filter(r => !r.success),
    });
  }
}
