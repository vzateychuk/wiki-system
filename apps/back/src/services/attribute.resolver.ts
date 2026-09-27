import { 
  JevDecisionResponse,
  JevFreeTextAnswer 
} from '../types/jev.types.js';

const CONFIDENCE_THRESHOLD = 0.65;

/** Специальные маркеры отсутствия данных в ответах JEV */
const ABSENT_VALUES = new Set(['NONE', 'UNKNOWN', 'NOT_FOUND', 'NULL', 'N/A']);

function isAbsentValue(raw: string): boolean {
  return ABSENT_VALUES.has(raw.trim().toUpperCase());
}

/**
 * Нормализует путь к файлу:
 * - конвертирует breadcrumbs (>, ›) в слеши
 * - убирает бэкслеши и дубликаты слешей
 * - приводит к нижнему регистру
 */
function normalizeFilePath(raw: string): string {
  if (!raw || !raw.trim()) return '';
  
  const trimmed = raw.trim();
  if (isAbsentValue(trimmed)) return '';

  let path = trimmed
    .replace(/\s*[>›\/\\]\s*/g, '/') // Очищает пробелы вокруг '>', '›', '/' и '\'
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/$/, '');
  
  path = path.replace(/^[^a-zA-Z0-9_\/.-]+/, '');
  path = path.replace(/[^a-zA-Z0-9_\/.-]+$/, '');
  
  return path.toLowerCase();
}

/**
 * Нормализует URL: приводит к единому виду hostname + pathname без протокола, query и hash.
 */
function normalizeBrowserUrl(raw: string): string {
  if (!raw || !raw.trim()) return '';
  
  const trimmed = raw.trim();
  if (isAbsentValue(trimmed)) return '';
  
  try {
    const urlStr = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(urlStr);
    return `${url.hostname}${url.pathname}`.replace(/\/$/, '').toLowerCase();
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, '')
      .replace(/[#?].*$/, '')
      .replace(/\/$/, '')
      .toLowerCase();
  }
}

/**
 * Нормализует Jira-ключ: поддерживает проекты с цифрами (PROJ-123, TEAM1-456).
 */
function normalizeJiraTicket(raw: string): string {
  if (!raw || !raw.trim()) return '';
  
  const trimmed = raw.trim();
  if (isAbsentValue(trimmed)) return '';
  
  const match = trimmed.match(/([A-Z][A-Z0-9_]+-\d+)/i);
  return match ? match[1].toUpperCase() : '';
}

/**
 * Извлекает текст из free-text ответа JEV с защитой от разной именования полей.
 */
function getFreeText(answer?: JevFreeTextAnswer): string {
  if (!answer || answer.noul === undefined || answer.noul === null) return '';
  
  // Если JEV всё равно прислал числовую метрику (например 0.56), игнорируем ее
  if (typeof answer.noul === 'number') return '';
  
  return String(answer.noul).trim();
}

/**
 * Сервис для детерминированного формирования contextKey.
 */
export class JevAttributeResolver {
  resolve(response: JevDecisionResponse): string | null {
    const imageTypeAnswer = response.answers?.image_type;
    const category = imageTypeAnswer?.choice;
    const categoryConfidence = imageTypeAnswer?.confidence ?? 0;

    // Проверяем уверенность категории
    if (!category || categoryConfidence < CONFIDENCE_THRESHOLD) {
      return null;
    }

    const filePath = normalizeFilePath(getFreeText(response.answers?.file_path));
    const browserUrl = normalizeBrowserUrl(getFreeText(response.answers?.browser_url));
    const jiraTicket = normalizeJiraTicket(getFreeText(response.answers?.jira_ticket));

    switch (category) {
      case 'ide_code':
      case 'config_editor': {
        return filePath || null;
      }

      case 'jira_issue': {
        return jiraTicket || browserUrl || null;
      }

      case 'web_dashboard':
      case 'email_draft': {
        return browserUrl || null;
      }

      case 'github_repo': {
        if (browserUrl && filePath) {
          return `${browserUrl}#${filePath}`;
        }
        return browserUrl || filePath || null;
      }

      case 'messenger_chat':
      case 'unknown':
      default: {
        return null;
      }
    }
  }
}