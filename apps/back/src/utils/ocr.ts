import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

export async function runOcr(imagePath: string): Promise<string> {
  try {
    // execFile безопасен, так как не использует shell-интерпретатор
    const { stdout } = await execFilePromise(
      'tesseract',
      [imagePath, 'stdout', '-l', 'eng', '--psm', '6'],
      {
        // Увеличиваем буфер до 10 МБ для защиты от падений при больших текстах
        maxBuffer: 10 * 1024 * 1024, 
      }
    );
    
    return stdout.trim();
  } catch (error) {
    // Безопасное логирование без утечки stack trace на клиент
    console.error(`[OCR Error] Failed to process ${imagePath}:`, error);
    throw new Error('ОКР обработка завершилась с ошибкой');
  }
}
