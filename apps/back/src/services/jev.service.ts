import { 
  JevRequest, 
  JevDecisionResponse,
  ImageCategory
} from '../types/jev.types.js';
import { JevAttributeResolver } from './attribute.resolver.js';

const IMAGE_CATEGORY: Record<ImageCategory, string> = {
  github_repo: 'GitHub repository with file tree, branches, and commits',
  jira_issue: 'Jira or Atlassian task, issue page, ticket details, backlog board, or acceptance criteria',
  email_draft: 'Email draft, text document, or written report',
  web_dashboard: 'Generic web dashboard, analytics page, status cards, or admin forms',
  messenger_chat: 'Chat or messaging application (Slack, Teams, Telegram)',
  ide_code: 'IDE code editor with source code file open',
  config_editor: 'Configuration file editor (XML, YAML, JSON, ENV)',
  unknown: 'Unknown interface or unrecognized content',
};

const FREE_TEXT_QUESTIONS = {
  file_path: {
    type: 'noul' as const,
    instructions: 'Extract the active file name with its extension (e.g. filename.ext) visible in editor tabs or breadcrumbs. Do not include directory paths. Return NONE if not present.',
  },
  browser_url: {
    type: 'noul' as const,
    instructions: 'Extract the web URL visible in the browser address bar. Return NONE if not present.',
  },
  jira_ticket: {
    type: 'noul' as const,
    instructions: 'Extract the Jira issue key or ticket identifier (a hyphenated code). Return NONE if not present.',
  },
};

export class JevService {
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly resolver: JevAttributeResolver;

  constructor(resolver: JevAttributeResolver, private readonly apiKey: string) {
    if (!this.apiKey) {
      throw new Error('JevService requires an OpenRouter API key');
    }
    this.apiUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/alpha/decisions';
    this.model = process.env.JEV_MODEL || 'typesafe/jev-1.13';
    this.resolver = resolver;
  }

  /**
   * Отправляет OCR-текст в OpenRouter API (single pass, 4 вопроса)
   * и возвращает полный ответ JEV со всеми ответами.
   */
  async analyze(ocrText: string): Promise<JevDecisionResponse> {
    const requestBody: JevRequest = {
      model: this.model,
      state: ocrText,
      questions: {
        image_type: {
          type: 'choice',
          instructions: 'Identify the UI screenshot type',
          criteria: IMAGE_CATEGORY,
        },
        file_path: FREE_TEXT_QUESTIONS.file_path,
        browser_url: FREE_TEXT_QUESTIONS.browser_url,
        jira_ticket: FREE_TEXT_QUESTIONS.jira_ticket,
      },
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as JevDecisionResponse;
      return data;

    } catch (error) {
      console.error('[JevService] Failed to analyze screenshot:', error);
      return {
        model: this.model,
        answers: {
          image_type: {
            type: 'choice',
            choice: 'unknown',
            confidence: 0,
          },
        },
      };
    }
  }

  /**
   * Удобный метод: анализ + резолв contextKey за один вызов.
   */
  async analyzeAndResolve(ocrText: string): Promise<{
    response: JevDecisionResponse;
    contextKey: string | null;
  }> {
    const response = await this.analyze(ocrText);
    const contextKey = this.resolver.resolve(response);
    return { response, contextKey };
  }

  /**
   * Type Guard для проверки, что ответ действительно является одной из допустимых категорий.
   */
  private isValidCategory(category: unknown): category is ImageCategory {
    return typeof category === 'string' && Object.hasOwn(IMAGE_CATEGORY, category);
  }

  /**
   * Удаляет нулевые и близкие к нулю вероятности, оставляя только значимые.
   * Это уменьшает размер ответа и убирает шум.
   */
  private filterProbabilities(
    probs?: Partial<Record<ImageCategory, number>>
  ): Partial<Record<ImageCategory, number>> | undefined {
    if (!probs) return undefined;
    
    const filtered: Partial<Record<ImageCategory, number>> = {};
    for (const [key, value] of Object.entries(probs)) {
      if (value && value > 0) {
        filtered[key as ImageCategory] = value;
      }
    }
    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }
}