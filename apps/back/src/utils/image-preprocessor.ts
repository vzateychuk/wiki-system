import sharp from 'sharp';
import path from 'node:path';

export interface PreprocessImageOptions {
  outputDir?: string;
}

const DARK_THEME_BRIGHTNESS_THRESHOLD = 128;
const UPSCALE_FACTOR = 2;
const MAX_UPSCALE_WIDTH = 4000;

/**
 * Creates a temporary, OCR-optimized PNG while preserving the source image.
 */
export async function preprocessImageForOcr(
  inputPath: string,
  options: PreprocessImageOptions = {}
): Promise<string> {
  const image = sharp(inputPath);
  const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);

  if (!metadata.width) {
    throw new Error(`Unable to determine image width: ${inputPath}`);
  }

  // Alpha is excluded: it describes transparency rather than visual brightness.
  const colorChannels = stats.channels.slice(0, 3);
  if (colorChannels.length === 0) {
    throw new Error(`Unable to determine image brightness: ${inputPath}`);
  }

  const averageBrightness = colorChannels.reduce(
    (sum, channel) => sum + channel.mean,
    0
  ) / colorChannels.length;
  const isDarkTheme = averageBrightness < DARK_THEME_BRIGHTNESS_THRESHOLD;
  const finalWidth = Math.min(
    metadata.width * UPSCALE_FACTOR,
    MAX_UPSCALE_WIDTH
  );

  const parsedPath = path.parse(inputPath);
  const outputPath = path.join(
    options.outputDir ?? parsedPath.dir,
    `ocr_${parsedPath.name}.png`
  );

  let pipeline = sharp(inputPath)
    .resize({
      width: finalWidth,
      kernel: sharp.kernel.lanczos3,
    })
    .greyscale();

  if (isDarkTheme) {
    pipeline = pipeline.negate();
  }

  await pipeline.normalise().sharpen().png().toFile(outputPath);

  return outputPath;
}
