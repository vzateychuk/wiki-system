import fs from 'node:fs/promises';
import path from 'node:path';
import { runOcr } from '../utils/ocr.js';
import { JevService } from './jev.service.js';
import type { UploadResult, ImageCategory } from '../types/jev.types.js';

export class UploadService {
  constructor(
    private readonly jevService: JevService,
    private readonly wikiBaseDir: string
  ) {}

  async process(filePath: string, originalName: string): Promise<UploadResult> {
    try {
      // 1. Pre-processing (Stub)
      await this.preprocess(filePath);

      // 2. OCR
      const extractedText = await runOcr(filePath);

      // 3. Category identification via JEV
      const { category, confidence, probabilities } = await this.jevService.getCategory(extractedText);

      // 4. Save to wiki/raw/images with slug
      const savedImagePath = await this.saveToWiki(filePath, originalName, category);

      // 5. Post-processing (Stub)
      await this.postprocess(savedImagePath);

      return {
        success: true,
        originalName,
        savedImagePath,
        category,
        confidence,
        probabilities,
      };
    } catch (error: unknown) {
      return {
        success: false,
        originalName,
        error: error instanceof Error ? error.message : 'Unknown error during upload',
      };
    }
  }

  private async preprocess(filePath: string): Promise<void> {
    // Stub for pre-processing
    return Promise.resolve();
  }

  private async postprocess(filePath: string): Promise<void> {
    // Stub for post-processing
    return Promise.resolve();
  }

  private async saveToWiki(filePath: string, originalName: string, category: string): Promise<string> {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/T/, '_')
      .replace(/\..+/, '')
      .replace(/:/g, '-'); // yyyy-MM-dd_hh-mm-ss

    const extension = path.extname(originalName) || '.png';
    const slug = `${timestamp}_${category}`;
    const fileName = `${slug}${extension}`;
    
    const targetDir = path.join(this.wikiBaseDir, 'raw/images');
    await fs.mkdir(targetDir, { recursive: true });
    
    const targetPath = path.join(targetDir, fileName);
    await fs.copyFile(filePath, targetPath);
    
    return targetPath;
  }
}